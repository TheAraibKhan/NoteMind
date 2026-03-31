/**
 * Rate Limiting Middleware — Production Grade
 *
 * Features:
 * - Per-IP rate limiting with sliding window approximation
 * - Separate limits for AI-heavy endpoints vs general API
 * - Automatic cleanup of expired entries
 * - Retry-After header for 429 responses
 */

import { Request, Response, NextFunction } from "express";
import { ERROR_MESSAGES } from "@/constants/aiPrompts";

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ============================================================================
// STORE (in-memory; swap for Redis in multi-instance production)
// ============================================================================

const stores: Map<string, Map<string, RateLimitEntry>> = new Map();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }
}, 60_000).unref(); // Every minute, don't block exit

// ============================================================================
// FACTORY
// ============================================================================

export function rateLimitMiddleware(
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100,
  storeName: string = "default",
) {
  // Get or create store for this middleware instance
  if (!stores.has(storeName)) {
    stores.set(storeName, new Map());
  }
  const store = stores.get(storeName)!;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      store.set(key, { count: 1, resetTime: now + windowMs });
      setRateLimitHeaders(res, maxRequests, maxRequests - 1, now + windowMs);
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      setRateLimitHeaders(res, maxRequests, 0, entry.resetTime);
      res.setHeader("Retry-After", retryAfter);

      return res.status(429).json({
        success: false,
        error: ERROR_MESSAGES.RATE_LIMITED,
        retryAfter,
      });
    }

    setRateLimitHeaders(
      res,
      maxRequests,
      maxRequests - entry.count,
      entry.resetTime,
    );
    next();
  };
}

/**
 * Stricter rate limit specifically for AI generation endpoints.
 * Prevents abuse of expensive Gemini API calls.
 */
export function aiRateLimitMiddleware() {
  return rateLimitMiddleware(
    60 * 1000, // 1-minute window
    10, // 10 AI requests per minute per IP
    "ai-endpoints",
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number,
): void {
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining));
  res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000));
}
