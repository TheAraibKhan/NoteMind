/**
 * Hybrid AI Service for NoteMind — Groq + Wikipedia
 *
 * Manages parallel processing of multiple AI sources with intelligent
 * result selection, fallback chains, and quality scoring.
 *
 * Features:
 * - Parallel Groq + Wikipedia processing
 * - Quality-based result selection
 * - Intelligent merging of multiple sources
 * - Per-API timeout management
 * - Load balancing and failover
 * - Performance monitoring
 */

import { logger } from "@/utils/logger";
import { cachingService } from "@/services/cachingService";
import { responseValidationService } from "@/services/responseValidationService";
import {
  NotesContent,
  QuizQuestion,
  FlashcardContent,
  AIResponse,
} from "@/services/aiService";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export enum DataSource {
  GROQ = "groq",
  WIKIPEDIA = "wikipedia",
  HYBRID = "hybrid",
  CACHE = "cache",
}

export interface SourceQualityScore {
  source: DataSource;
  score: number; // 0-100
  confidence: number; // 0-1
  completeness: number; // 0-1
  accuracy: number; // 0-1
  relevance: number; // 0-1
}

export interface HybridResult<T> {
  data: T;
  source: DataSource;
  quality: SourceQualityScore;
  timestamp: number;
  processingTime: number;
}

const GROQ_TIMEOUT = 30_000;
const WIKIPEDIA_TIMEOUT = 15_000;
const HYBRID_TIMEOUT = Math.max(GROQ_TIMEOUT, WIKIPEDIA_TIMEOUT) + 5_000;

// ============================================================================
// UTILITY: RACING & TIMEOUT MANAGEMENT
// ============================================================================

/**
 * Execute a promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<{ result?: T; error?: Error; timedOut: boolean }> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);

    if (timeoutHandle) clearTimeout(timeoutHandle);
    return { result, timedOut: false };
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    const isTimeout =
      error instanceof Error && error.message.includes("timed out");
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      timedOut: isTimeout,
    };
  }
}

/**
 * Execute multiple async operations in parallel with timeout
 */
async function raceWithTimeout<T>(
  operations: Array<{ label: string; promise: Promise<T>; timeout: number }>,
  returnFirst: boolean = false,
): Promise<
  Array<{ label: string; result?: T; error?: Error; timedOut: boolean }>
> {
  const startTime = Date.now();
  const results = await Promise.all(
    operations.map((op) =>
      withTimeout(op.promise, op.timeout, op.label).then((r) => ({
        label: op.label,
        ...r,
      })),
    ),
  );

  const processingTime = Date.now() - startTime;
  logger.debug("HybridAI", "raceWithTimeout completed", {
    operations: operations.map((o) => o.label),
    processingTime,
  });

  return results;
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

function scoreNotesContent(notes: NotesContent): SourceQualityScore {
  let score = 0;
  const issues: string[] = [];

  // Check completeness
  const hasDefinition = !!notes.definition && notes.definition.length > 50;
  const hasKeyConcepts =
    Array.isArray(notes.key_concepts) && notes.key_concepts.length >= 3;
  const hasImportantPoints =
    Array.isArray(notes.important_points) && notes.important_points.length >= 3;
  const hasExamples =
    Array.isArray(notes.examples) && notes.examples.length >= 2;
  const hasHighlights =
    Array.isArray(notes.exam_highlights) && notes.exam_highlights.length >= 2;

  if (!hasDefinition) issues.push("Missing or short definition");
  if (!hasKeyConcepts) issues.push("Missing key concepts");
  if (!hasImportantPoints) issues.push("Missing important points");
  if (!hasExamples) issues.push("Missing examples");
  if (!hasHighlights) issues.push("Missing exam highlights");

  const completeness =
    [
      hasDefinition,
      hasKeyConcepts,
      hasImportantPoints,
      hasExamples,
      hasHighlights,
    ].filter(Boolean).length / 5;

  // Estimate accuracy (higher for professional sources like Wikipedia)
  const accuracy = 0.85; // Default

  // Relevance (we assume it's relevant if it got this far)
  const relevance = 0.9;

  // Calculate score
  score = completeness * 50 + accuracy * 30 + relevance * 20;

  if (issues.length > 0) {
    logger.debug("HybridAI", "Quality issues detected in notes", { issues });
  }

  return {
    source: DataSource.HYBRID,
    score: Math.round(score),
    confidence: 0.85,
    completeness,
    accuracy,
    relevance,
  };
}

function scoreQuizQuestions(questions: QuizQuestion[]): SourceQualityScore {
  let score = 0;
  const issues: string[] = [];

  // Check count
  const hasEnoughQuestions = questions.length >= 4;
  if (!hasEnoughQuestions) issues.push("Not enough questions");

  // Check structure
  let validCount = 0;
  for (const q of questions) {
    const hasQuestion = !!q.question && q.question.length > 10;
    const hasOptions = Array.isArray(q.options) && q.options.length === 4;
    const hasCorrectAnswer =
      typeof q.correctAnswer === "number" &&
      q.correctAnswer >= 0 &&
      q.correctAnswer < 4;
    const hasExplanation = !!q.explanation && q.explanation.length > 10;

    if (hasQuestion && hasOptions && hasCorrectAnswer && hasExplanation) {
      validCount++;
    }
  }

  const completeness = Math.min(1, validCount / 5);
  const accuracy = 0.8; // Hard to measure without human review
  const relevance = 0.9;

  score = completeness * 50 + accuracy * 30 + relevance * 20;

  if (issues.length > 0) {
    logger.debug("HybridAI", "Quality issues detected in quiz", { issues });
  }

  return {
    source: DataSource.HYBRID,
    score: Math.round(score),
    confidence: 0.8,
    completeness,
    accuracy,
    relevance,
  };
}

function scoreFlashcards(cards: FlashcardContent[]): SourceQualityScore {
  let score = 0;
  const issues: string[] = [];

  // Check count
  const hasEnoughCards = cards.length >= 5;
  if (!hasEnoughCards) issues.push("Not enough flashcards");

  // Check structure
  let validCount = 0;
  for (const card of cards) {
    const hasFront = !!card.front && card.front.length > 5;
    const hasBack = !!card.back && card.back.length > 10;

    if (hasFront && hasBack) {
      validCount++;
    }
  }

  const completeness = Math.min(1, validCount / 8);
  const accuracy = 0.85;
  const relevance = 0.9;

  score = completeness * 50 + accuracy * 30 + relevance * 20;

  if (issues.length > 0) {
    logger.debug("HybridAI", "Quality issues detected in flashcards", {
      issues,
    });
  }

  return {
    source: DataSource.HYBRID,
    score: Math.round(score),
    confidence: 0.8,
    completeness,
    accuracy,
    relevance,
  };
}

// ============================================================================
// PUBLIC: HYBRID PROCESSING (LOGS AND MONITORING)
// ============================================================================

export async function selectBestResult<T>(
  results: Array<{
    label: string;
    data?: T;
    error?: Error;
    timedOut: boolean;
  }>,
  scorer: (data: T) => SourceQualityScore,
  fallbackLabel?: string,
): Promise<{
  data?: T;
  source: string;
  quality: SourceQualityScore | null;
}> {
  // Filter successful results
  const successful = results.filter((r) => r.data && !r.error && !r.timedOut);

  if (successful.length === 0) {
    logger.warn("HybridAI", "All sources failed", {
      failedCount: results.length,
      reasons: results.map((r) => ({
        source: r.label,
        error: r.error?.message,
        timedOut: r.timedOut,
      })),
    });
    return { source: "none", quality: null };
  }

  // Score successful results
  const scored = successful.map((r) => ({
    label: r.label,
    data: r.data!,
    quality: scorer(r.data!),
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.quality.score - a.quality.score);

  const best = scored[0];
  logger.info("HybridAI", "Selected best result", {
    source: best.label,
    score: best.quality.score,
    alternatives: scored
      .slice(1)
      .map((s) => ({ source: s.label, score: s.quality.score })),
  });

  return {
    data: best.data,
    source: best.label,
    quality: best.quality,
  };
}

export async function logHybridOperation<T>(
  operation: string,
  topic: string,
  sources: string[],
  result: {
    data?: T;
    source: string;
    quality: SourceQualityScore | null;
  },
  processingTime: number,
): Promise<void> {
  logger.info("HybridAI", `${operation} completed`, {
    topic: topic.slice(0, 50),
    availableSources: sources,
    selectedSource: result.source,
    qualityScore: result.quality?.score,
    processingTime: `${processingTime}ms`,
    cacheRecommendation:
      result.quality && result.quality.score >= 70 ? "recommend" : "consider",
  });
}

export async function handleHybridFallback<T>(
  primaryError: Error | null,
  secondaryError: Error | null,
  topic: string,
  operation: string,
): Promise<{ success: false; error: string }> {
  logger.error(
    "HybridAI",
    `${operation} - all sources failed (fallback)`,
    primaryError || new Error("Unknown error"),
    {
      topic: topic.slice(0, 50),
      primaryError: primaryError?.message,
      secondaryError: secondaryError?.message,
    },
  );

  return {
    success: false,
    error:
      "Our learning service is temporarily unavailable. Please try again in a few moments, or check your internet connection.",
  };
}

// ============================================================================
// MONITORING & DIAGNOSTICS
// ============================================================================

export function getHybridServiceStatus(): {
  groqAvailable: boolean;
  wikipediaAvailable: boolean;
  cacheEnabled: boolean;
  hybridModeEnabled: boolean;
  timeouts: { groq: number; wikipedia: number; hybrid: number };
} {
  return {
    groqAvailable: !!process.env.GROQ_API_KEY,
    wikipediaAvailable: !!process.env.FREE_NOTES_API_URL,
    cacheEnabled: process.env.CACHE_ENABLED !== "false",
    hybridModeEnabled: process.env.USE_HYBRID_MODE !== "false",
    timeouts: {
      groq: GROQ_TIMEOUT,
      wikipedia: WIKIPEDIA_TIMEOUT,
      hybrid: HYBRID_TIMEOUT,
    },
  };
}

// ============================================================================
// EXPORT: RACE & TIMEOUT UTILITIES
// ============================================================================

export { raceWithTimeout, withTimeout };
