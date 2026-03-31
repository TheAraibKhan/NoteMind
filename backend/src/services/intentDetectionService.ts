/**
 * Intent Detection Service — Production Grade
 *
 * Analyses user queries to determine their learning intent
 * and routes requests to the appropriate AI generation pipeline.
 */

import { QueryIntent, INTENT_KEYWORDS } from "@/constants/aiPrompts";
import { logger } from "@/utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface IntentDetectionResult {
  intent: QueryIntent;
  confidence: number; // 0-1
  keywords: string[];
}

// ============================================================================
// SERVICE
// ============================================================================

class IntentDetectionService {
  /**
   * Detect the user's intent from their query.
   * Uses keyword scoring with position weighting.
   */
  detect(query: string): IntentDetectionResult {
    const lowerQuery = ` ${query.toLowerCase()} `; // pad for word-boundary matching

    const scores: Record<QueryIntent, { score: number; matches: string[] }> = {
      [QueryIntent.NOTES]: { score: 0, matches: [] },
      [QueryIntent.QUIZ]: { score: 0, matches: [] },
      [QueryIntent.FLASHCARDS]: { score: 0, matches: [] },
      [QueryIntent.EXPLANATION]: { score: 0, matches: [] },
      [QueryIntent.COMPARISON]: { score: 0, matches: [] },
      [QueryIntent.SUMMARY]: { score: 0, matches: [] },
      [QueryIntent.GENERAL_QUESTION]: { score: 0, matches: [] },
      [QueryIntent.UNKNOWN]: { score: 0, matches: [] },
    };

    // Score by keyword match count
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (intent === QueryIntent.UNKNOWN) continue;

      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          // Give higher weight for multi-word keyword matches (they're more specific)
          const weight = keyword.includes(" ") ? 2 : 1;
          scores[intent as QueryIntent].score += weight;
          scores[intent as QueryIntent].matches.push(keyword);
        }
      }
    }

    // Find highest scoring intent
    let bestIntent = QueryIntent.GENERAL_QUESTION;
    let bestScore = 0;

    for (const [intent, data] of Object.entries(scores)) {
      if (intent === QueryIntent.UNKNOWN) continue;
      if (data.score > bestScore) {
        bestScore = data.score;
        bestIntent = intent as QueryIntent;
      }
    }

    // Calculate confidence (0-1)
    const confidence = Math.min(bestScore / 4, 1);

    // If no keywords matched at all, default to GENERAL_QUESTION with low confidence
    if (bestScore === 0) {
      bestIntent = QueryIntent.GENERAL_QUESTION;
    }

    logger.debug("IntentDetection", "Intent detected", {
      query: query.slice(0, 60),
      intent: bestIntent,
      confidence: Number(confidence.toFixed(2)),
      keywords: scores[bestIntent]?.matches || [],
    });

    return {
      intent: bestIntent,
      confidence,
      keywords: scores[bestIntent]?.matches || [],
    };
  }

  /**
   * Should this intent use AI generation?
   */
  shouldUseAI(intent: QueryIntent): boolean {
    return intent !== QueryIntent.UNKNOWN;
  }

  /**
   * Get system prompt context for a specific intent.
   * This is appended to the base system prompt when handling
   * free-form questions via answerStudyQuestion.
   */
  getIntentContext(intent: QueryIntent): string {
    const contexts: Record<QueryIntent, string> = {
      [QueryIntent.NOTES]:
        "The user wants structured study notes. Respond with a clear title, definition, key concepts, important points, and examples. Use markdown formatting.",
      [QueryIntent.QUIZ]:
        "The user wants practice questions. Provide 5 multiple-choice questions with explanations for each answer.",
      [QueryIntent.FLASHCARDS]:
        "The user wants flashcards for revision. Create concise question-answer pairs optimised for active recall.",
      [QueryIntent.EXPLANATION]:
        "The user wants a thorough explanation of a concept. Structure your response with: Title → Core Explanation → Key Points → Example → Takeaway. Use markdown.",
      [QueryIntent.COMPARISON]:
        "The user wants to compare concepts. Structure your response with: Brief intro → Similarities → Differences → When to use each → Summary table if applicable.",
      [QueryIntent.SUMMARY]:
        "The user wants a concise summary. Keep it focused: main idea in 1-2 sentences, then 3-5 key takeaways as bullet points.",
      [QueryIntent.GENERAL_QUESTION]:
        "The user is asking a general learning question. Provide a thorough, educational answer structured with a title, explanation, key points, a practical example, and a takeaway. Use markdown formatting.",
      [QueryIntent.UNKNOWN]:
        "The user's intent is unclear. Provide a helpful, educational response and suggest ways to refine the question.",
    };

    return contexts[intent] || contexts[QueryIntent.GENERAL_QUESTION];
  }
}

export const intentDetectionService = new IntentDetectionService();
