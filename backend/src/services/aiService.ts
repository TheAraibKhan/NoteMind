/**
 * Production-Level AI Service for NoteMind — Google Gemini
 *
 * Architecture:
 * ┌──────────────────────────────────────────────────────────┐
 * │  Public API (generateNotesContent, generateQuizQuestions,│
 * │  generateFlashcards, answerStudyQuestion)                │
 * │      ↓                                                   │
 * │  Input Validation Layer                                  │
 * │      ↓                                                   │
 * │  Cache Check                                             │
 * │      ↓ (miss)                                            │
 * │  Circuit Breaker Check                                   │
 * │      ↓ (closed/half-open)                                │
 * │  Gemini Call with Retry + Timeout                        │
 * │      ↓                                                   │
 * │  Response Validation Layer                               │
 * │      ↓                                                   │
 * │  Cache Store → Return                                    │
 * │                                                          │
 * │  Fallback: Wikipedia (notes) or graceful error           │
 * └──────────────────────────────────────────────────────────┘
 *
 * Key features:
 * - Google Gemini API (gemini-2.0-flash) for fast, free-tier AI
 * - Circuit breaker prevents cascading failures
 * - Exponential backoff retry for transient errors
 * - Response validation catches hallucinations and weak content
 * - Wikipedia fallback for notes when Gemini is unavailable
 * - Every error path returns a clean, user-friendly message
 * - Zero unhandled exceptions — every code path is wrapped
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import {
  AI_PROMPTS,
  ERROR_MESSAGES,
  QueryIntent,
  RETRY_CONFIG,
  CIRCUIT_BREAKER_CONFIG,
} from "@/constants/aiPrompts";
import { logger } from "@/utils/logger";
import { inputValidationService } from "@/services/validationService";
import { intentDetectionService } from "@/services/intentDetectionService";
import { responseValidationService } from "@/services/responseValidationService";
import { cachingService } from "@/services/cachingService";

// ============================================================================
// INTERFACES
// ============================================================================

export interface NotesContent {
  title?: string;
  definition: string;
  key_concepts: string[];
  important_points: string[];
  examples: string[];
  exam_highlights?: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface FlashcardContent {
  front: string;
  back: string;
}

export interface GeneralResponse {
  title?: string;
  explanation: string;
  key_points?: string[];
  example?: string;
  takeaway?: string;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

interface WikipediaSearchResponse {
  query?: {
    search?: Array<{ title: string; snippet: string }>;
  };
}

interface WikipediaExtractResponse {
  query?: {
    pages?: Record<string, { title?: string; extract?: string }>;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_TIMEOUT = 30_000; // 30 seconds
const WIKIPEDIA_API_URL =
  process.env.FREE_NOTES_API_URL || "https://en.wikipedia.org/w/api.php";
const USE_FREE_API_ONLY = process.env.USE_FREE_API_ONLY === "true";
const ENABLE_CACHE = process.env.CACHE_ENABLED !== "false";

// Stop words filtered out when comparing query relevance to Wikipedia results
const STOP_WORDS = new Set([
  "what", "is", "my", "the", "a", "an", "of", "in", "on", "at", "to", "for",
  "and", "or", "but", "not", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "how", "why", "when", "where", "who",
  "this", "that", "these", "those", "it", "its", "with", "from", "by",
  "about", "tell", "me", "give", "know", "your", "you", "am",
]);

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

enum CircuitState {
  CLOSED = "CLOSED",       // Normal operation
  OPEN = "OPEN",           // Failing — block all calls
  HALF_OPEN = "HALF_OPEN", // Testing recovery
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;

  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= CIRCUIT_BREAKER_CONFIG.RECOVERY_TIMEOUT_MS) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCalls = 0;
        logger.info("CircuitBreaker", "Transitioning to HALF_OPEN — testing recovery");
        return true;
      }
      return false;
    }

    // HALF_OPEN — allow limited calls
    return this.halfOpenCalls < CIRCUIT_BREAKER_CONFIG.HALF_OPEN_MAX_CALLS;
  }

  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= CIRCUIT_BREAKER_CONFIG.HALF_OPEN_MAX_CALLS) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        logger.info("CircuitBreaker", "Recovery confirmed — circuit CLOSED");
      }
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  recordFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      logger.warn("CircuitBreaker", "Recovery failed — circuit OPEN again", {
        error: error.message,
      });
    } else if (this.failureCount >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
      this.state = CircuitState.OPEN;
      logger.error("CircuitBreaker", "Failure threshold reached — circuit OPEN", error, {
        failureCount: this.failureCount,
        recoveryIn: `${CIRCUIT_BREAKER_CONFIG.RECOVERY_TIMEOUT_MS / 1000}s`,
      });
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    logger.info("CircuitBreaker", "Manually reset — circuit CLOSED");
  }

  getState(): { state: CircuitState; failureCount: number } {
    return { state: this.state, failureCount: this.failureCount };
  }
}

const circuitBreaker = new CircuitBreaker();

// ============================================================================
// GEMINI CLIENT MANAGEMENT
// ============================================================================

let cachedClient: GoogleGenerativeAI | null = null;
let cachedModel: GenerativeModel | null = null;

const getModel = (): GenerativeModel | null => {
  if (!process.env.GEMINI_API_KEY || USE_FREE_API_ONLY) {
    return null;
  }

  if (!circuitBreaker.isAvailable()) {
    logger.debug("AIService", "Circuit breaker is OPEN — skipping Gemini");
    return null;
  }

  // Reuse client + model instance
  if (!cachedModel) {
    cachedClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    cachedModel = cachedClient.getGenerativeModel({
      model: GEMINI_MODEL,
    });
  }

  return cachedModel;
};

// ============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const result = await operation();
      if (attempt > 0) {
        logger.info("AIService", `${operationName} succeeded on retry ${attempt}`, {
          totalAttempts: attempt + 1,
        });
      }
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-transient errors
      if (isNonRetryableError(lastError)) {
        logger.warn("AIService", `${operationName} failed with non-retryable error`, {
          error: lastError.message,
          attempt,
        });
        circuitBreaker.recordFailure(lastError);
        throw lastError;
      }

      if (attempt < RETRY_CONFIG.MAX_RETRIES) {
        const delay = Math.min(
          RETRY_CONFIG.BASE_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt),
          RETRY_CONFIG.MAX_DELAY_MS,
        );
        logger.warn("AIService", `${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          error: lastError.message,
        });
        await sleep(delay);
      }
    }
  }

  circuitBreaker.recordFailure(lastError!);
  throw lastError!;
}

function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("api_key_invalid") ||
    message.includes("api key not valid") ||
    message.includes("permission_denied") ||
    message.includes("invalid_argument") ||
    message.includes("safety") ||
    message.includes("blocked")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const splitIntoSentences = (text: string): string[] =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const cleanSnippet = (text: string): string =>
  text
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength - 3).trimEnd()}...`;

const normalizeTopic = (topic: string): string =>
  topic.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Safely extract JSON from an AI response that may contain extra text,
 * markdown code fences, etc.
 */
function extractJSON(text: string): string {
  // Remove markdown code fences
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

  // Try to find a JSON object
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];

  // Try to find a JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];

  throw new Error("No JSON found in response");
}

// ============================================================================
// CORE: STRUCTURED RESPONSE GENERATION (GEMINI)
// ============================================================================

async function createStructuredResponse<T>(
  name: string,
  systemPrompt: string,
  userPrompt: string,
  topic: string,
): Promise<T> {
  const model = getModel();

  if (!model) {
    throw new Error("GEMINI_UNAVAILABLE");
  }

  const timer = logger.startTimer("AIService", `Gemini ${name}`);

  const fullPrompt = `${systemPrompt}\n\n---\n\nUSER REQUEST:\n${userPrompt}`;

  const response = await withRetry(async () => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2500,
      },
    });

    return result;
  }, `createStructuredResponse:${name}`);

  const content = response.response.text();
  if (!content) {
    throw new Error("Empty response from Gemini");
  }

  timer.done({ topic: topic.slice(0, 50), responseLength: content.length });

  // Parse JSON
  let parsed: T;
  try {
    const jsonString = extractJSON(content);
    parsed = JSON.parse(jsonString) as T;
  } catch (parseError) {
    logger.error("AIService", "Failed to parse Gemini response as JSON", parseError as Error, {
      rawResponse: content.slice(0, 300),
    });
    throw new Error("Invalid JSON response from AI");
  }

  return parsed;
}

// ============================================================================
// WIKIPEDIA FALLBACK
// ============================================================================

async function fetchWikipediaNotes(topic: string): Promise<NotesContent> {
  logger.debug("AIService", "Fetching Wikipedia fallback", { topic });

  const normalized = normalizeTopic(topic);
  const searchUrl = `${WIKIPEDIA_API_URL}?action=query&list=search&srsearch=${encodeURIComponent(normalized)}&utf8=1&format=json&origin=*`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const searchResponse = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!searchResponse.ok) {
      throw new Error(`Wikipedia search failed: ${searchResponse.status}`);
    }

    const searchData = (await searchResponse.json()) as WikipediaSearchResponse;
    const bestMatch = searchData.query?.search?.[0];

    if (!bestMatch?.title) {
      throw new Error("No Wikipedia results found");
    }

    // ---- RELEVANCE CHECK ----
    const queryWords = new Set(
      normalized.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    );
    const titleWords = new Set(
      bestMatch.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    );

    const overlap = [...queryWords].filter((w) => titleWords.has(w)).length;
    const relevanceScore = queryWords.size > 0 ? overlap / queryWords.size : 0;

    if (relevanceScore === 0 && queryWords.size > 0) {
      logger.warn("AIService", "Wikipedia result not relevant to query", {
        query: normalized.slice(0, 50),
        wikiTitle: bestMatch.title,
        queryWords: [...queryWords],
        titleWords: [...titleWords],
      });
      throw new Error("Wikipedia result not relevant to query");
    }

    const extractUrl = `${WIKIPEDIA_API_URL}?action=query&prop=extracts&explaintext=1&exintro=0&titles=${encodeURIComponent(bestMatch.title)}&format=json&origin=*`;

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 10_000);

    const extractResponse = await fetch(extractUrl, { signal: controller2.signal });
    clearTimeout(timeout2);

    if (!extractResponse.ok) {
      throw new Error(`Wikipedia extract failed: ${extractResponse.status}`);
    }

    const extractData = (await extractResponse.json()) as WikipediaExtractResponse;
    const page = Object.values(extractData.query?.pages || {})[0];
    const extract = cleanSnippet(page?.extract || "");
    const sentences = splitIntoSentences(extract);

    const definition =
      truncate(sentences[0] || cleanSnippet(bestMatch.snippet || ""), 300) ||
      `${bestMatch.title} is a topic worth studying.`;

    const keyConcepts = sentences.slice(1, 5).map((s) => truncate(s, 200)).filter(Boolean);
    const importantPoints = sentences.slice(5, 9).map((s) => truncate(s, 200)).filter(Boolean);
    const examples = sentences.slice(9, 12).map((s) => truncate(s, 200)).filter(Boolean);

    return {
      title: bestMatch.title,
      definition,
      key_concepts:
        keyConcepts.length > 0
          ? keyConcepts
          : [
              `Understand the fundamental concepts of ${bestMatch.title}`,
              `Learn how ${bestMatch.title} is applied in practice`,
              `Explore the key principles behind ${bestMatch.title}`,
            ],
      important_points:
        importantPoints.length > 0
          ? importantPoints
          : [
              `${bestMatch.title} has significant real-world applications`,
              `Understanding ${bestMatch.title} builds a strong foundation`,
              `Review the core facts and principles of ${bestMatch.title}`,
            ],
      examples:
        examples.length > 0
          ? examples
          : [
              `Look for practical applications of ${bestMatch.title}`,
              `Study real-world cases involving ${bestMatch.title}`,
            ],
      exam_highlights: [
        `Remember the definition and core concept of ${bestMatch.title}`,
        `Be ready to explain key features of ${bestMatch.title}`,
        `Understand how ${bestMatch.title} connects to related topics`,
      ],
    };
  } catch (error) {
    logger.error("AIService", "Wikipedia fallback failed", error as Error);

    return {
      title: topic,
      definition: `${topic} is an important concept worth studying in depth.`,
      key_concepts: [
        "Understand the core definition and foundation",
        "Learn related concepts and connections",
        "Study practical, real-world applications",
      ],
      important_points: [
        "Focus on understanding the main ideas",
        "Review key facts and supporting details",
        "Practice applying concepts to examples",
      ],
      examples: [
        "Look for real-world applications and case studies",
        "Find practical demonstrations of the concept",
      ],
      exam_highlights: [
        "Know the definition thoroughly",
        "Remember key concepts and relationships",
        "Be prepared to explain with examples",
      ],
    };
  }
}

// ============================================================================
// NOTES GENERATION
// ============================================================================

export async function generateNotesContent(
  topic: string,
): Promise<AIResponse<NotesContent>> {
  try {
    if (!topic || !topic.trim()) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT };
    }

    const normalized = normalizeTopic(topic);

    // Cache check
    if (ENABLE_CACHE) {
      const cached = cachingService.get<NotesContent>(normalized, "notes");
      if (cached) {
        logger.debug("AIService", "Returning cached notes", { topic: normalized.slice(0, 50) });
        return { success: true, data: cached, cached: true };
      }
    }

    const model = getModel();

    if (!model) {
      logger.info("AIService", "Gemini unavailable, using Wikipedia fallback for notes");
      const notes = await fetchWikipediaNotes(normalized);
      cachingService.set(normalized, notes, "notes");
      return { success: true, data: notes };
    }

    // Generate with Gemini
    const notes = await createStructuredResponse<NotesContent>(
      "study_notes",
      `${AI_PROMPTS.BASE_SYSTEM}\n\n${AI_PROMPTS.STUDY_NOTES}`,
      `Create comprehensive study notes for: "${topic}"\n\nReturn ONLY valid JSON matching the required format. No additional text.`,
      normalized,
    );

    // Validate structure
    const validation = responseValidationService.validateStructure(notes);
    if (!validation.isValid) {
      logger.warn("AIService", "Generated notes failed validation, falling back to Wikipedia", {
        issues: validation.issues,
      });
      const fallback = await fetchWikipediaNotes(normalized);
      cachingService.set(normalized, fallback, "notes");
      return { success: true, data: fallback };
    }

    // Ensure title exists
    if (!notes.title) {
      notes.title = topic.charAt(0).toUpperCase() + topic.slice(1);
    }

    cachingService.set(normalized, notes, "notes");
    return { success: true, data: notes };
  } catch (error) {
    logger.error("AIService", "Notes generation failed", error as Error, { topic });

    // Fallback to Wikipedia on ANY error
    try {
      const fallback = await fetchWikipediaNotes(topic);
      cachingService.set(normalizeTopic(topic), fallback, "notes");
      return { success: true, data: fallback };
    } catch {
      return { success: false, error: ERROR_MESSAGES.AI_UNAVAILABLE };
    }
  }
}

// ============================================================================
// QUIZ GENERATION
// ============================================================================

export async function generateQuizQuestions(
  topic: string,
): Promise<AIResponse<QuizQuestion[]>> {
  try {
    if (!topic || !topic.trim()) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT };
    }

    const normalized = normalizeTopic(topic);

    // Cache check
    if (ENABLE_CACHE) {
      const cached = cachingService.get<QuizQuestion[]>(normalized, "quiz");
      if (cached) {
        logger.debug("AIService", "Returning cached quiz", { topic: normalized.slice(0, 50) });
        return { success: true, data: cached, cached: true };
      }
    }

    const model = getModel();
    if (!model) {
      return {
        success: false,
        error: "Quiz generation requires our AI service, which is temporarily unavailable. Please try again shortly, or generate study notes instead.",
      };
    }

    const response = await createStructuredResponse<{ questions: QuizQuestion[] }>(
      "quiz_questions",
      `${AI_PROMPTS.BASE_SYSTEM}\n\n${AI_PROMPTS.QUIZ_QUESTIONS}`,
      `Create 5 multiple-choice quiz questions on "${topic}" that test genuine understanding.\n\nReturn ONLY valid JSON with a "questions" array. No additional text.`,
      normalized,
    );

    const questions = response.questions;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      logger.warn("AIService", "Quiz response missing questions array", { topic });
      return { success: false, error: ERROR_MESSAGES.WEAK_RESPONSE };
    }

    // Validate and fix each question
    const validQuestions: QuizQuestion[] = [];
    for (const q of questions) {
      if (
        typeof q.correctAnswer !== "number" ||
        q.correctAnswer < 0 ||
        q.correctAnswer > 3
      ) {
        logger.warn("AIService", "Skipping question with invalid correctAnswer", {
          question: q.question?.slice(0, 50),
          correctAnswer: q.correctAnswer,
        });
        continue;
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        logger.warn("AIService", "Skipping question with wrong option count", {
          question: q.question?.slice(0, 50),
          optionCount: q.options?.length,
        });
        continue;
      }

      if (!q.question || !q.explanation) {
        continue;
      }

      validQuestions.push(q);
    }

    if (validQuestions.length < 3) {
      logger.warn("AIService", "Too few valid questions generated", {
        total: questions.length,
        valid: validQuestions.length,
      });
      return { success: false, error: ERROR_MESSAGES.WEAK_RESPONSE };
    }

    cachingService.set(normalized, validQuestions, "quiz");
    return { success: true, data: validQuestions };
  } catch (error) {
    logger.error("AIService", "Quiz generation failed", error as Error, { topic });
    return { success: false, error: ERROR_MESSAGES.AI_UNAVAILABLE };
  }
}

// ============================================================================
// FLASHCARDS GENERATION
// ============================================================================

export async function generateFlashcards(
  topic: string,
): Promise<AIResponse<FlashcardContent[]>> {
  try {
    if (!topic || !topic.trim()) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT };
    }

    const normalized = normalizeTopic(topic);

    // Cache check
    if (ENABLE_CACHE) {
      const cached = cachingService.get<FlashcardContent[]>(normalized, "flashcards");
      if (cached) {
        logger.debug("AIService", "Returning cached flashcards", { topic: normalized.slice(0, 50) });
        return { success: true, data: cached, cached: true };
      }
    }

    const model = getModel();
    if (!model) {
      return {
        success: false,
        error: "Flashcard generation requires our AI service, which is temporarily unavailable. Please try again shortly, or generate study notes instead.",
      };
    }

    const response = await createStructuredResponse<{ cards: FlashcardContent[] }>(
      "flashcards",
      `${AI_PROMPTS.BASE_SYSTEM}\n\n${AI_PROMPTS.FLASHCARDS}`,
      `Create effective revision flashcards for "${topic}".\n\nReturn ONLY valid JSON with a "cards" array. No additional text.`,
      normalized,
    );

    const cards = response.cards;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      logger.warn("AIService", "Flashcard response missing cards array", { topic });
      return { success: false, error: ERROR_MESSAGES.WEAK_RESPONSE };
    }

    const validCards = cards.filter((c) => {
      if (!c.front || !c.back) {
        logger.warn("AIService", "Skipping malformed flashcard", {
          hasFront: !!c.front,
          hasBack: !!c.back,
        });
        return false;
      }
      return true;
    });

    if (validCards.length < 3) {
      logger.warn("AIService", "Too few valid flashcards generated", {
        total: cards.length,
        valid: validCards.length,
      });
      return { success: false, error: ERROR_MESSAGES.WEAK_RESPONSE };
    }

    cachingService.set(normalized, validCards, "flashcards");
    return { success: true, data: validCards };
  } catch (error) {
    logger.error("AIService", "Flashcard generation failed", error as Error, { topic });
    return { success: false, error: ERROR_MESSAGES.AI_UNAVAILABLE };
  }
}

// ============================================================================
// GENERAL QUESTION ANSWERING
// ============================================================================

export async function answerStudyQuestion(
  query: string,
): Promise<AIResponse<GeneralResponse>> {
  try {
    // ---- Step 1: Validate input ----
    const validation = inputValidationService.validate(query);
    if (!validation.isValid) {
      logger.info("AIService", "Query rejected by input validation", {
        reason: validation.reason,
        rejectionType: validation.rejectionType,
        query: inputValidationService.sanitizeForLogging(query),
      });

      return {
        success: false,
        error: validation.reason || ERROR_MESSAGES.INVALID_INPUT,
      };
    }

    const sanitized = validation.sanitized || query.trim();
    const normalized = normalizeTopic(sanitized);

    // ---- Step 2: Detect intent ----
    const intent = intentDetectionService.detect(sanitized);
    logger.debug("AIService", "Query intent", {
      intent: intent.intent,
      confidence: Number(intent.confidence.toFixed(2)),
    });

    // ---- Step 3: Cache check ----
    const cachePrefix = `query:${intent.intent}`;
    if (ENABLE_CACHE) {
      const cached = cachingService.get<GeneralResponse>(normalized, cachePrefix);
      if (cached) {
        logger.debug("AIService", "Returning cached answer", {
          topic: normalized.slice(0, 50),
        });
        return { success: true, data: cached, cached: true };
      }
    }

    // ---- Step 4: Check Gemini availability ----
    const model = getModel();
    if (!model) {
      logger.warn("AIService", "Gemini unavailable for question answering");
      return {
        success: false,
        error: ERROR_MESSAGES.AI_UNAVAILABLE,
      };
    }

    // ---- Step 5: Call Gemini with retry ----
    const intentContext = intentDetectionService.getIntentContext(intent.intent);
    const timer = logger.startTimer("AIService", "Gemini question-answer");

    const fullPrompt = `${AI_PROMPTS.BASE_SYSTEM}\n\n${intentContext}\n\n---\n\nUSER QUESTION:\n${sanitized}`;

    const response = await withRetry(async () => {
      return await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      });
    }, "answerStudyQuestion");

    const content = response.response.text();
    timer.done({ queryLength: sanitized.length, responseLength: content?.length ?? 0 });

    if (!content || content.trim().length === 0) {
      logger.error("AIService", "Empty response from Gemini for question");
      return { success: false, error: ERROR_MESSAGES.WEAK_RESPONSE };
    }

    // ---- Step 6: Validate response quality ----
    const qualityCheck = responseValidationService.validate(content);

    if (!qualityCheck.isValid) {
      logger.warn("AIService", "Response failed quality validation", {
        issues: qualityCheck.issues,
        confidence: Number(qualityCheck.confidence.toFixed(2)),
      });

      if (qualityCheck.confidence > 0.4) {
        const structured: GeneralResponse = {
          title: "Study Response",
          explanation: content,
        };
        return { success: true, data: structured };
      }

      return { success: false, error: ERROR_MESSAGES.WEAK_RESPONSE };
    }

    // ---- Step 7: Structure and return ----
    const structured: GeneralResponse = {
      explanation: content,
    };

    // Extract title from markdown if present
    const titleMatch = content.match(/^#+\s+(.+?)[\r\n]/);
    if (titleMatch) {
      structured.title = titleMatch[1].replace(/[*#]/g, "").trim();
    } else {
      structured.title = "Study Response";
    }

    cachingService.set(normalized, structured, cachePrefix);

    logger.info("AIService", "Question answered successfully", {
      queryLength: sanitized.length,
      responseLength: content.length,
      intent: intent.intent,
      cached: false,
    });

    return { success: true, data: structured };
  } catch (error) {
    logger.error(
      "AIService",
      "Question answering failed",
      error as Error,
      { query: inputValidationService.sanitizeForLogging(query) },
    );

    return {
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }
}

// ============================================================================
// HEALTH & DIAGNOSTICS
// ============================================================================

export function getAIServiceHealth(): Record<string, unknown> {
  return {
    provider: "Google Gemini",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    model: GEMINI_MODEL,
    freeApiOnly: USE_FREE_API_ONLY,
    cacheEnabled: ENABLE_CACHE,
    circuitBreaker: circuitBreaker.getState(),
    cacheStats: cachingService.getStats() as unknown as Record<string, unknown>,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const aiService = {
  generateNotesContent,
  generateQuizQuestions,
  generateFlashcards,
  answerStudyQuestion,
  getHealth: getAIServiceHealth,
  clearCache: () => cachingService.clear(),
  getCacheStats: () => cachingService.getStats() as unknown as Record<string, unknown>,
  resetCircuitBreaker: () => circuitBreaker.reset(),
};

export default aiService;
