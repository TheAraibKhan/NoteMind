/**
 * Input Validation Service — Production Grade
 *
 * Validates user queries BEFORE they reach the AI service layer.
 * Goals:
 *  - Reject empty, too-short, or too-long inputs
 *  - Detect spam patterns and pure casual chat
 *  - Accept ANY legitimate learning query regardless of domain
 *  - Prevent wasted Gemini API calls on clearly invalid inputs
 *  - Return user-friendly error messages, never expose internals
 */

import { VALIDATION_RULES, ERROR_MESSAGES } from "@/constants/aiPrompts";
import { logger } from "@/utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  sanitized?: string;
  rejectionType?:
    | "empty"
    | "too_short"
    | "too_long"
    | "spam"
    | "casual"
    | "meaningless";
}

// ============================================================================
// SERVICE
// ============================================================================

class InputValidationService {
  /**
   * Main validation entry point.
   * Returns { isValid: true, sanitized } on success, or { isValid: false, reason } on failure.
   */
  validate(input: string): ValidationResult {
    // ---- Guard: null / undefined / wrong type ----
    if (!input || typeof input !== "string") {
      return this.reject("empty", ERROR_MESSAGES.INVALID_INPUT);
    }

    const trimmed = input.trim();

    // ---- Guard: empty after trim ----
    if (trimmed.length === 0) {
      return this.reject("empty", ERROR_MESSAGES.INVALID_INPUT);
    }

    // ---- Guard: too short ----
    if (trimmed.length < VALIDATION_RULES.MIN_QUERY_LENGTH) {
      return this.reject("too_short", ERROR_MESSAGES.INVALID_INPUT);
    }

    // ---- Guard: too long ----
    if (trimmed.length > VALIDATION_RULES.MAX_QUERY_LENGTH) {
      return this.reject(
        "too_long",
        `Your question is too long. Please keep it under ${VALIDATION_RULES.MAX_QUERY_LENGTH} characters.`,
      );
    }

    // ---- Guard: spam patterns ----
    if (this.matchesSpamPattern(trimmed)) {
      logger.debug("InputValidation", "Spam pattern matched", {
        query: this.sanitizeForLogging(trimmed),
      });
      return this.reject("spam", ERROR_MESSAGES.INVALID_INPUT);
    }

    // ---- Guard: pure casual greeting ----
    if (this.isCasualOnly(trimmed)) {
      logger.debug("InputValidation", "Casual-only input", {
        query: this.sanitizeForLogging(trimmed),
      });
      return this.reject("casual", ERROR_MESSAGES.CASUAL_INPUT);
    }

    // ---- Guard: personal/unanswerable questions ----
    // MUST be checked BEFORE meaningful keywords because personal questions
    // contain keywords like "what", "my", "how" that would pass keyword checks.
    if (this.isPersonalQuestion(trimmed)) {
      logger.info("InputValidation", "Personal question rejected", {
        query: this.sanitizeForLogging(trimmed),
      });
      return this.reject("meaningless", ERROR_MESSAGES.PERSONAL_QUESTION);
    }

    // ---- Guard: gibberish / no real content ----
    if (!this.hasSubstantiveContent(trimmed)) {
      logger.debug("InputValidation", "No substantive content", {
        query: this.sanitizeForLogging(trimmed),
      });
      return this.reject("meaningless", ERROR_MESSAGES.INVALID_INPUT);
    }

    // ---- Passed all checks ----
    logger.debug("InputValidation", "Query validated OK", {
      length: trimmed.length,
    });

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Sanitize user input for safe logging (truncate + strip newlines).
   */
  sanitizeForLogging(input: string, maxLength: number = 100): string {
    return input
      .slice(0, maxLength)
      .replace(/[\r\n]+/g, " ")
      .trim();
  }

  /**
   * Simple similarity check between two strings.
   * Used for cache-key deduplication.
   */
  isSimilarTo(a: string, b: string): boolean {
    const na = a.toLowerCase().trim().replace(/\s+/g, " ");
    const nb = b.toLowerCase().trim().replace(/\s+/g, " ");
    if (na === nb) return true;

    // Jaccard similarity on word sets
    const wordsA = new Set(na.split(" "));
    const wordsB = new Set(nb.split(" "));
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 && intersection / union > 0.85;
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private reject(
    type: ValidationResult["rejectionType"],
    reason: string,
  ): ValidationResult {
    return { isValid: false, reason, rejectionType: type };
  }

  private matchesSpamPattern(input: string): boolean {
    return VALIDATION_RULES.SPAM_PATTERNS.some((pattern) =>
      pattern.test(input),
    );
  }

  private isCasualOnly(input: string): boolean {
    return VALIDATION_RULES.CASUAL_ONLY_PATTERNS.some((pattern) =>
      pattern.test(input),
    );
  }

  /**
   * Detect personal / unanswerable questions.
   * These are questions about the user's own data (height, name, age, etc.)
   * that the AI has no way to answer. If let through, they produce
   * misleading results from Wikipedia or hallucinated AI responses.
   */
  private isPersonalQuestion(input: string): boolean {
    return VALIDATION_RULES.PERSONAL_QUESTION_PATTERNS.some((pattern) =>
      pattern.test(input),
    );
  }

  /**
   * Determine whether the input has real learning/question content.
   *
   * IMPORTANT: This is intentionally permissive.
   * We accept anything that looks like it COULD be a legitimate query:
   *   - Contains a meaningful keyword, OR
   *   - Contains a question mark, OR
   *   - Is longer than 15 characters (short phrases can be valid topics like "black holes")
   *   - Contains at least 2 real alphabetic words
   *
   * The AI model itself handles ambiguous queries — our job is only to
   * block clearly invalid inputs, NOT to judge query quality.
   */
  private hasSubstantiveContent(input: string): boolean {
    const lower = input.toLowerCase();

    // 1. Contains a meaningful keyword → definitely valid
    const hasKeyword = VALIDATION_RULES.MEANINGFUL_KEYWORDS.some((kw) =>
      lower.includes(kw),
    );
    if (hasKeyword) return true;

    // 2. Contains a question mark → likely a question
    if (input.includes("?")) return true;

    // 3. Has enough alphabetic content
    const alphaWords = input.match(/[a-zA-Z]{2,}/g) || [];
    const nonPunctuationLen = input.replace(/[^a-zA-Z0-9]/g, "").length;

    // If it's very short AND has no keywords or question mark, reject
    if (nonPunctuationLen < VALIDATION_RULES.MIN_QUERY_LENGTH) return false;

    // If there are at least 2 real words, or the input is reasonably long, accept it.
    // This allows topic-only inputs like "photosynthesis", "black holes", "react hooks"
    if (alphaWords.length >= 1 && nonPunctuationLen >= 3) return true;

    return false;
  }
}

export const inputValidationService = new InputValidationService();
