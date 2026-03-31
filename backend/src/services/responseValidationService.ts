/**
 * Response Validation Service — Production Grade
 *
 * Validates AI responses BEFORE sending them to the frontend.
 * Catches:
 *  - Too-short or empty responses
 *  - Responses that look like hallucinations or fabrications
 *  - Incoherent / excessively repetitive text
 *  - Missing required fields in structured JSON responses
 *
 * Does NOT catch:
 *  - Factual inaccuracies (that's the system prompt's job)
 *  - Subject-matter content that mentions "violence" etc in a valid educational context
 */

import { QUALITY_THRESHOLDS } from "@/constants/aiPrompts";
import { logger } from "@/utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface ResponseValidationResult {
  isValid: boolean;
  issues: string[];
  confidence: number; // 0-1 — higher = more likely valid
}

// ============================================================================
// SERVICE
// ============================================================================

class ResponseValidationService {
  /**
   * Validate a free-text AI response (used for answerStudyQuestion).
   */
  validate(response: string): ResponseValidationResult {
    const issues: string[] = [];
    let confidence = 1.0;

    // ---- Check 1: Length ----
    if (!response || response.trim().length === 0) {
      return { isValid: false, issues: ["Empty response"], confidence: 0 };
    }

    if (response.length < QUALITY_THRESHOLDS.MIN_RESPONSE_LENGTH) {
      issues.push("Response too short — insufficient detail");
      confidence -= 0.3;
    }

    if (response.length > QUALITY_THRESHOLDS.MAX_RESPONSE_LENGTH) {
      issues.push("Response excessively long");
      confidence -= 0.1; // Long is usually OK, just flagged
    }

    // ---- Check 2: Fabrication markers ----
    if (this.hasFabricationMarkers(response)) {
      issues.push("Possible fabricated content detected");
      confidence -= 0.35;
    }

    // ---- Check 3: Coherence ----
    if (!this.isCoherent(response)) {
      issues.push("Response appears incoherent or overly repetitive");
      confidence -= 0.25;
    }

    // ---- Check 4: Model refusal / meta-talk ----
    if (this.isModelRefusal(response)) {
      issues.push("Response is a model refusal or meta-talk, not actual content");
      confidence -= 0.4;
    }

    const isValid = confidence >= QUALITY_THRESHOLDS.CONFIDENCE_THRESHOLD && issues.length <= 1;

    logger.debug("ResponseValidation", "Free-text response validated", {
      isValid,
      issueCount: issues.length,
      confidence: Number(confidence.toFixed(2)),
      responseLength: response.length,
    });

    return {
      isValid,
      issues,
      confidence: Math.max(confidence, 0),
    };
  }

  /**
   * Validate a structured JSON response (notes, quizzes, flashcards).
   *
   * For notes, checks that definition, key_concepts, important_points, examples exist.
   * For quizzes, checks questions array.
   * For flashcards, checks cards array.
   */
  validateStructure(data: unknown): ResponseValidationResult {
    const issues: string[] = [];
    let confidence = 1.0;

    if (!data || typeof data !== "object") {
      return {
        isValid: false,
        issues: ["Response is not a valid object"],
        confidence: 0,
      };
    }

    const obj = data as Record<string, unknown>;

    // Check for notes-specific structure
    if ("definition" in obj || "key_concepts" in obj) {
      // This looks like a notes response
      if (!obj.definition || (typeof obj.definition === "string" && obj.definition.length < 5)) {
        issues.push("Missing or too-short definition");
        confidence -= 0.2;
      }
      for (const arrField of ["key_concepts", "important_points", "examples"] as const) {
        if (!obj[arrField]) {
          issues.push(`Missing required field: ${arrField}`);
          confidence -= 0.15;
        } else if (!Array.isArray(obj[arrField])) {
          issues.push(`Field '${arrField}' should be an array`);
          confidence -= 0.15;
        } else if ((obj[arrField] as unknown[]).length === 0) {
          issues.push(`Array '${arrField}' is empty`);
          confidence -= 0.1;
        }
      }
    }

    // Check for quiz-specific structure
    if ("questions" in obj) {
      if (!Array.isArray(obj.questions)) {
        issues.push("'questions' is not an array");
        confidence -= 0.3;
      } else {
        const questions = obj.questions as Record<string, unknown>[];
        if (questions.length === 0) {
          issues.push("No questions generated");
          confidence -= 0.3;
        }
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (!q.question || !q.options || !Array.isArray(q.options)) {
            issues.push(`Question ${i + 1} is malformed`);
            confidence -= 0.1;
          }
          if (typeof q.correctAnswer !== "number" || q.correctAnswer < 0 || q.correctAnswer > 3) {
            issues.push(`Question ${i + 1} has invalid correctAnswer`);
            confidence -= 0.1;
          }
        }
      }
    }

    // Check for flashcard-specific structure
    if ("cards" in obj) {
      if (!Array.isArray(obj.cards)) {
        issues.push("'cards' is not an array");
        confidence -= 0.3;
      } else {
        const cards = obj.cards as Record<string, unknown>[];
        if (cards.length === 0) {
          issues.push("No cards generated");
          confidence -= 0.3;
        }
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (!c.front || !c.back) {
            issues.push(`Card ${i + 1} missing front or back`);
            confidence -= 0.1;
          }
        }
      }
    }

    const isValid = confidence >= 0.5;

    logger.debug("ResponseValidation", "Structure validated", {
      isValid,
      issueCount: issues.length,
      confidence: Number(confidence.toFixed(2)),
    });

    return {
      isValid,
      issues,
      confidence: Math.max(confidence, 0),
    };
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  /**
   * Detect fabrication markers — NOT "I'm not sure" (which is actually honest).
   * We look for markers that indicate the model MADE SOMETHING UP.
   */
  private hasFabricationMarkers(response: string): boolean {
    const fabricationPatterns = [
      /\[citation needed\]/i,
      /\[source needed\]/i,
      /\[source:\s*\]/i,
      /I (?:just )?made (?:this|that|it) up/i,
      /this is (?:a )?(?:fake|fabricated|fictional) (?:example|source|reference)/i,
    ];
    return fabricationPatterns.some((p) => p.test(response));
  }

  /**
   * Check for coherence using sentence count, word uniqueness ratio,
   * and average sentence length.
   */
  private isCoherent(response: string): boolean {
    // Split into sentences (handle markdown bullet points too)
    const sentences = response
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    if (sentences.length < QUALITY_THRESHOLDS.MIN_SENTENCE_COUNT) {
      return false;
    }

    // Check word repetition (excluding common stop words)
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been",
      "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
      "it", "this", "that", "as", "by", "from", "not", "can", "will",
    ]);

    const words = response.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
    const contentWords = words.filter((w) => !stopWords.has(w));

    if (contentWords.length === 0) return false;

    const uniqueContentWords = new Set(contentWords);
    const uniqueRatio = uniqueContentWords.size / contentWords.length;

    // If less than 25% unique content words → too repetitive
    if (uniqueRatio < 0.25) {
      return false;
    }

    return true;
  }

  /**
   * Detect when the model refuses to answer or goes meta
   * (e.g., "As a language model, I cannot…")
   */
  private isModelRefusal(response: string): boolean {
    const refusalPatterns = [
      /^I('m| am) (sorry|afraid),?\s+(but\s+)?I (can't|cannot|am unable to)/i,
      /^As an? (AI|language model|artificial intelligence)/i,
      /^I do not have (the ability|access|enough information)/i,
    ];

    // Only check the first 200 characters — refusals always start at the beginning
    const start = response.slice(0, 200);
    return refusalPatterns.some((p) => p.test(start));
  }
}

export const responseValidationService = new ResponseValidationService();
