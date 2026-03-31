/**
 * Wikipedia Service — Dedicated Fallback Knowledge Source
 *
 * Extracted from the old aiService into its own module for clean separation.
 * Provides structured educational content from Wikipedia when AI providers fail
 * or when the query is factual and Wikipedia can provide authoritative data.
 *
 * Features:
 * - Search + extract pipeline
 * - Relevance scoring (prevents off-topic results)
 * - Structured output for notes, Q&A, quizzes, and flashcards
 * - Full error handling — never throws unhandled
 * - Timeout protection (10s per request)
 */

import { logger } from "@/utils/logger";
import type { NotesContent, QuizQuestion, FlashcardContent, GeneralResponse } from "./providers/types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const WIKIPEDIA_API_URL =
  process.env.FREE_NOTES_API_URL || "https://en.wikipedia.org/w/api.php";

const WIKIPEDIA_TIMEOUT_MS = 10_000;

const STOP_WORDS = new Set([
  "what", "is", "my", "the", "a", "an", "of", "in", "on", "at", "to", "for",
  "and", "or", "but", "not", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "how", "why", "when", "where", "who",
  "this", "that", "these", "those", "it", "its", "with", "from", "by",
  "about", "tell", "me", "give", "know", "your", "you", "am",
]);

// ============================================================================
// TYPES
// ============================================================================

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

interface WikipediaResult {
  title: string;
  extract: string;
  snippet: string;
  relevanceScore: number;
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

// ============================================================================
// CORE: FETCH WIKIPEDIA DATA
// ============================================================================

async function fetchWikipediaData(topic: string): Promise<WikipediaResult | null> {
  const normalized = normalizeTopic(topic);
  const searchUrl = `${WIKIPEDIA_API_URL}?action=query&list=search&srsearch=${encodeURIComponent(normalized)}&utf8=1&format=json&origin=*`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WIKIPEDIA_TIMEOUT_MS);

    const searchResponse = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!searchResponse.ok) {
      throw new Error(`Wikipedia search failed: ${searchResponse.status}`);
    }

    const searchData = (await searchResponse.json()) as WikipediaSearchResponse;
    const bestMatch = searchData.query?.search?.[0];

    if (!bestMatch?.title) {
      logger.debug("WikiService", "No Wikipedia results found", { topic: normalized.slice(0, 50) });
      return null;
    }

    // ---- Relevance check ----
    const queryWords = new Set(
      normalized.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    );
    const titleWords = new Set(
      bestMatch.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    );

    const overlap = [...queryWords].filter((w) => titleWords.has(w)).length;
    const relevanceScore = queryWords.size > 0 ? overlap / queryWords.size : 0;

    if (relevanceScore === 0 && queryWords.size > 0) {
      logger.warn("WikiService", "Wikipedia result not relevant to query", {
        query: normalized.slice(0, 50),
        wikiTitle: bestMatch.title,
      });
      return null;
    }

    // ---- Fetch full extract ----
    const extractUrl = `${WIKIPEDIA_API_URL}?action=query&prop=extracts&explaintext=1&exintro=0&titles=${encodeURIComponent(bestMatch.title)}&format=json&origin=*`;

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), WIKIPEDIA_TIMEOUT_MS);

    const extractResponse = await fetch(extractUrl, { signal: controller2.signal });
    clearTimeout(timeout2);

    if (!extractResponse.ok) {
      throw new Error(`Wikipedia extract failed: ${extractResponse.status}`);
    }

    const extractData = (await extractResponse.json()) as WikipediaExtractResponse;
    const page = Object.values(extractData.query?.pages || {})[0];
    const extract = cleanSnippet(page?.extract || "");

    return {
      title: bestMatch.title,
      extract,
      snippet: cleanSnippet(bestMatch.snippet || ""),
      relevanceScore,
    };
  } catch (error) {
    logger.error("WikiService", "Wikipedia fetch failed", error as Error);
    return null;
  }
}

// ============================================================================
// PUBLIC: NOTES FROM WIKIPEDIA
// ============================================================================

export async function fetchWikipediaNotes(topic: string): Promise<NotesContent> {
  logger.info("WikiService", "Fetching Wikipedia notes", { topic: topic.slice(0, 60) });

  const result = await fetchWikipediaData(topic);

  if (!result) {
    return createStaticNotes(topic);
  }

  const sentences = splitIntoSentences(result.extract);

  const definition =
    truncate(sentences[0] || result.snippet, 300) ||
    `${result.title} is a topic worth studying.`;

  const keyConcepts = sentences.slice(1, 5).map((s) => truncate(s, 200)).filter(Boolean);
  const importantPoints = sentences.slice(5, 9).map((s) => truncate(s, 200)).filter(Boolean);
  const examples = sentences.slice(9, 12).map((s) => truncate(s, 200)).filter(Boolean);

  return {
    title: result.title,
    definition,
    key_concepts:
      keyConcepts.length > 0
        ? keyConcepts
        : [
            `Understand the fundamental concepts of ${result.title}`,
            `Learn how ${result.title} is applied in practice`,
            `Explore the key principles behind ${result.title}`,
          ],
    important_points:
      importantPoints.length > 0
        ? importantPoints
        : [
            `${result.title} has significant real-world applications`,
            `Understanding ${result.title} builds a strong foundation`,
            `Review the core facts and principles of ${result.title}`,
          ],
    examples:
      examples.length > 0
        ? examples
        : [
            `Look for practical applications of ${result.title}`,
            `Study real-world cases involving ${result.title}`,
          ],
    exam_highlights: [
      `Remember the definition and core concept of ${result.title}`,
      `Be ready to explain key features of ${result.title}`,
      `Understand how ${result.title} connects to related topics`,
    ],
  };
}

// ============================================================================
// PUBLIC: Q&A FROM WIKIPEDIA
// ============================================================================

export async function fetchWikipediaAnswer(query: string): Promise<GeneralResponse | null> {
  logger.info("WikiService", "Fetching Wikipedia answer", { query: query.slice(0, 60) });

  const result = await fetchWikipediaData(query);

  if (!result || result.extract.length < 50) {
    return null;
  }

  const sentences = splitIntoSentences(result.extract);
  const explanation = sentences.slice(0, 8).join(" ");

  if (explanation.length < 50) {
    return null;
  }

  return {
    title: result.title,
    explanation: `**${result.title}**\n\n${explanation}`,
    key_points: sentences.slice(1, 5).map((s) => truncate(s, 200)).filter(Boolean),
    example: sentences[8] ? truncate(sentences[8], 200) : undefined,
    takeaway: `This information is sourced from Wikipedia for reliability. For deeper understanding, explore related topics.`,
  };
}

// ============================================================================
// PUBLIC: QUIZ FROM WIKIPEDIA
// ============================================================================

export async function generateWikipediaQuiz(topic: string): Promise<QuizQuestion[] | null> {
  logger.info("WikiService", "Generating Wikipedia-based quiz", { topic: topic.slice(0, 60) });

  const result = await fetchWikipediaData(topic);

  if (!result || result.extract.length < 200) {
    return null;
  }

  const sentences = splitIntoSentences(result.extract);
  if (sentences.length < 5) return null;

  // Generate simple factual questions from Wikipedia content
  const questions: QuizQuestion[] = [];

  // Question 1: Definition question
  if (sentences[0]) {
    questions.push({
      question: `What best describes ${result.title}?`,
      options: [
        truncate(sentences[0], 100),
        `A fictional concept created for testing purposes`,
        `An unproven hypothesis with no real applications`,
        `A term that has no widely accepted definition`,
      ],
      correctAnswer: 0,
      explanation: `${sentences[0]}`,
    });
  }

  // Question 2: Key fact
  if (sentences[1]) {
    questions.push({
      question: `Which of the following is true about ${result.title}?`,
      options: [
        `It has no practical applications in any field`,
        truncate(sentences[1], 100),
        `It was only recently discovered in the last year`,
        `It is not studied in any academic discipline`,
      ],
      correctAnswer: 1,
      explanation: `${sentences[1]}`,
    });
  }

  // Question 3: Importance
  if (sentences[2]) {
    questions.push({
      question: `Why is ${result.title} significant?`,
      options: [
        `It is not considered significant by most experts`,
        `It only applies to theoretical scenarios`,
        truncate(sentences[2], 100),
        `Its significance has been widely debunked`,
      ],
      correctAnswer: 2,
      explanation: `${sentences[2]}`,
    });
  }

  // Question 4: Application
  if (sentences[3]) {
    questions.push({
      question: `What is an important aspect of ${result.title}?`,
      options: [
        `It has been completely replaced by newer concepts`,
        `There are no known examples of its application`,
        `It contradicts all existing scientific theories`,
        truncate(sentences[3], 100),
      ],
      correctAnswer: 3,
      explanation: `${sentences[3]}`,
    });
  }

  // Question 5: General knowledge
  if (sentences[4]) {
    questions.push({
      question: `Which statement about ${result.title} is accurate?`,
      options: [
        truncate(sentences[4], 100),
        `It was proven false by recent research`,
        `No academic institution teaches this subject`,
        `It has no connection to any other field of study`,
      ],
      correctAnswer: 0,
      explanation: `${sentences[4]}`,
    });
  }

  return questions.length >= 3 ? questions : null;
}

// ============================================================================
// PUBLIC: FLASHCARDS FROM WIKIPEDIA
// ============================================================================

export async function generateWikipediaFlashcards(topic: string): Promise<FlashcardContent[] | null> {
  logger.info("WikiService", "Generating Wikipedia-based flashcards", { topic: topic.slice(0, 60) });

  const result = await fetchWikipediaData(topic);

  if (!result || result.extract.length < 100) {
    return null;
  }

  const sentences = splitIntoSentences(result.extract);
  if (sentences.length < 4) return null;

  const cards: FlashcardContent[] = [];

  // Card 1: Definition
  cards.push({
    front: `What is ${result.title}?`,
    back: truncate(sentences[0], 250),
  });

  // Card 2: Key fact
  if (sentences[1]) {
    cards.push({
      front: `Name a key fact about ${result.title}`,
      back: truncate(sentences[1], 250),
    });
  }

  // Card 3: Significance
  if (sentences[2]) {
    cards.push({
      front: `Why is ${result.title} important?`,
      back: truncate(sentences[2], 250),
    });
  }

  // Card 4: Detail
  if (sentences[3]) {
    cards.push({
      front: `Describe an important aspect of ${result.title}`,
      back: truncate(sentences[3], 250),
    });
  }

  // Card 5: Additional
  if (sentences[4]) {
    cards.push({
      front: `What else should you know about ${result.title}?`,
      back: truncate(sentences[4], 250),
    });
  }

  // Card 6: Application
  if (sentences[5]) {
    cards.push({
      front: `How is ${result.title} applied or used?`,
      back: truncate(sentences[5], 250),
    });
  }

  return cards.length >= 3 ? cards : null;
}

// ============================================================================
// PUBLIC: HEALTH CHECK
// ============================================================================

export function getWikiServiceHealth(): Record<string, unknown> {
  return {
    configured: true,
    apiUrl: WIKIPEDIA_API_URL,
    timeoutMs: WIKIPEDIA_TIMEOUT_MS,
  };
}

// ============================================================================
// STATIC FALLBACK (last resort)
// ============================================================================

function createStaticNotes(topic: string): NotesContent {
  const title = topic.charAt(0).toUpperCase() + topic.slice(1);
  return {
    title,
    definition: `${title} is an important concept worth studying in depth.`,
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

// ============================================================================
// EXPORT
// ============================================================================

export const wikiService = {
  fetchNotes: fetchWikipediaNotes,
  fetchAnswer: fetchWikipediaAnswer,
  generateQuiz: generateWikipediaQuiz,
  generateFlashcards: generateWikipediaFlashcards,
  getHealth: getWikiServiceHealth,
};

export default wikiService;
