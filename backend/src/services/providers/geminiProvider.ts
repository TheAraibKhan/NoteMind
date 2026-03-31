/**
 * Gemini AI Provider — Secondary Fallback (FREE TIER)
 *
 * Uses the Google Generative AI SDK for Gemini models.
 * Activated when Groq fails or hits rate limits.
 *
 * Fallback chain: Groq (free) → Gemini (free tier) → OpenAI (paid, optional) → Wikipedia
 *
 * Model: gemini-2.0-flash (fast, free-tier friendly)
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { AIProvider, GenerationOptions } from "./types";
import { logger } from "@/utils/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ============================================================================
// PROVIDER
// ============================================================================

class GeminiProvider implements AIProvider {
  readonly name = "Gemini";
  private client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    const model = this.getModel();
    if (!model) {
      throw new Error("Gemini API key not configured");
    }

    const timer = logger.startTimer("GeminiProvider", "generateText");

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2500,
        },
      });

      const content = result.response.text();

      if (!content || content.trim().length === 0) {
        throw new Error("Empty response from Gemini");
      }

      timer.done({
        model: GEMINI_MODEL,
        responseLength: content.length,
      });

      return content;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (this.isRateLimitError(err)) {
        logger.warn("GeminiProvider", "Rate limit hit (429)", {
          message: err.message,
        });
        throw new Error(`RATE_LIMIT: ${err.message}`);
      }

      if (this.isAuthError(err)) {
        logger.error("GeminiProvider", "Authentication error — check API key", err);
        throw new Error(`AUTH_ERROR: ${err.message}`);
      }

      logger.error("GeminiProvider", "Generation failed", err);
      throw err;
    }
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private getModel(): GenerativeModel | null {
    if (!this.isConfigured()) return null;

    if (!this.model) {
      this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      this.model = this.client.getGenerativeModel({ model: GEMINI_MODEL });
    }

    return this.model;
  }

  private isRateLimitError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("rate_limit") ||
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("resource_exhausted") ||
      msg.includes("too many requests")
    );
  }

  private isAuthError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("api_key_invalid") ||
      msg.includes("api key not valid") ||
      msg.includes("permission_denied") ||
      msg.includes("invalid_argument") ||
      msg.includes("safety") ||
      msg.includes("blocked")
    );
  }
}

export const geminiProvider = new GeminiProvider();
