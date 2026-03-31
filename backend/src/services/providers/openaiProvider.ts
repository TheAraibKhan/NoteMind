/**
 * OpenAI Provider — Tertiary Fallback (PAID, Optional)
 *
 * Uses the official OpenAI SDK. Only activated if OPENAI_API_KEY is configured.
 * This is a paid API — only tried when both free providers (Groq, Gemini) fail.
 *
 * Fallback chain: Groq (free) → Gemini (free tier) → OpenAI (paid, optional) → Wikipedia
 *
 * Model: gpt-3.5-turbo (cost-effective, reliable)
 */

import OpenAI from "openai";
import { AIProvider, GenerationOptions } from "./types";
import { logger } from "@/utils/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
const OPENAI_TIMEOUT_MS = 30_000;

// ============================================================================
// PROVIDER
// ============================================================================

class OpenAIProvider implements AIProvider {
  readonly name = "OpenAI";
  private client: OpenAI | null = null;

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    const client = this.getClient();
    if (!client) {
      throw new Error("OpenAI API key not configured");
    }

    const timer = logger.startTimer("OpenAIProvider", "generateText");

    try {
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2500,
      });

      const content = completion.choices?.[0]?.message?.content;

      if (!content || content.trim().length === 0) {
        throw new Error("Empty response from OpenAI");
      }

      timer.done({
        model: OPENAI_MODEL,
        responseLength: content.length,
        tokensUsed: completion.usage?.total_tokens,
      });

      return content;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (this.isRateLimitError(err)) {
        logger.warn("OpenAIProvider", "Rate limit hit (429)", {
          message: err.message,
        });
        throw new Error(`RATE_LIMIT: ${err.message}`);
      }

      if (this.isAuthError(err)) {
        logger.error("OpenAIProvider", "Authentication error — check API key", err);
        throw new Error(`AUTH_ERROR: ${err.message}`);
      }

      logger.error("OpenAIProvider", "Generation failed", err);
      throw err;
    }
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private getClient(): OpenAI | null {
    if (!this.isConfigured()) return null;

    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: OPENAI_TIMEOUT_MS,
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
      msg.includes("too many requests") ||
      msg.includes("insufficient_quota")
    );
  }

  private isAuthError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("401") ||
      msg.includes("invalid_api_key") ||
      msg.includes("incorrect api key") ||
      msg.includes("permission") ||
      msg.includes("authentication")
    );
  }
}

export const openaiProvider = new OpenAIProvider();
