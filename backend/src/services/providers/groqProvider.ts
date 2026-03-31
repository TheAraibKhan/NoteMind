/**
 * Groq AI Provider — Primary Provider (FREE)
 *
 * Uses the Groq SDK to access Llama 3 models with extremely fast inference.
 * Groq is the primary provider due to its generous free tier and low latency.
 *
 * Fallback chain: Groq (free) → Gemini (free tier) → OpenAI (paid, optional) → Wikipedia
 *
 * Model: llama-3.1-8b-instant (fast, reliable, good for educational content)
 */

import Groq from "groq-sdk";
import { AIProvider, GenerationOptions } from "./types";
import { logger } from "@/utils/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_TIMEOUT_MS = 30_000;

// ============================================================================
// PROVIDER
// ============================================================================

class GroqProvider implements AIProvider {
  readonly name = "Groq";
  private client: Groq | null = null;

  isConfigured(): boolean {
    return !!process.env.GROQ_API_KEY;
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    const client = this.getClient();
    if (!client) {
      throw new Error("Groq API key not configured");
    }

    const timer = logger.startTimer("GroqProvider", "generateText");

    try {
      const completion = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2500,
      });

      const content = completion.choices?.[0]?.message?.content;

      if (!content || content.trim().length === 0) {
        throw new Error("Empty response from Groq");
      }

      timer.done({
        model: GROQ_MODEL,
        responseLength: content.length,
        tokensUsed: completion.usage?.total_tokens,
      });

      return content;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Classify the error for the circuit breaker
      if (this.isModelDecommissioned(err)) {
        logger.error("GroqProvider", "Model decommissioned — update GROQ_MODEL in .env", err);
        throw new Error(`AUTH_ERROR: ${err.message}`); // Treat as non-retryable
      }

      if (this.isRateLimitError(err)) {
        logger.warn("GroqProvider", "Rate limit hit (429)", {
          message: err.message,
        });
        throw new Error(`RATE_LIMIT: ${err.message}`);
      }

      if (this.isAuthError(err)) {
        logger.error("GroqProvider", "Authentication error — check API key", err);
        throw new Error(`AUTH_ERROR: ${err.message}`);
      }

      logger.error("GroqProvider", "Generation failed", err);
      throw err;
    }
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private getClient(): Groq | null {
    if (!this.isConfigured()) return null;

    if (!this.client) {
      this.client = new Groq({
        apiKey: process.env.GROQ_API_KEY,
        timeout: GROQ_TIMEOUT_MS,
      });
    }

    return this.client;
  }

  private isRateLimitError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("rate_limit") ||
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("too many requests")
    );
  }

  private isModelDecommissioned(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("model_decommissioned") ||
      msg.includes("decommissioned") ||
      msg.includes("model_not_found") ||
      msg.includes("does not exist") ||
      msg.includes("no longer supported")
    );
  }

  private isAuthError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("invalid_api_key") ||
      msg.includes("api key") ||
      msg.includes("authentication") ||
      msg.includes("permission_denied")
    );
  }
}

export const groqProvider = new GroqProvider();
