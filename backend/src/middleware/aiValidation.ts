/**
 * AI Input Validation Middleware
 *
 * Express middleware that validates AI-related request bodies
 * BEFORE they reach the controllers, saving processing time.
 */

import { Request, Response, NextFunction } from "express";
import { inputValidationService } from "@/services/validationService";
import { logger } from "@/utils/logger";

/**
 * Validates the `topic` field in request body for generation endpoints.
 * Rejects clearly invalid inputs at the middleware level.
 */
export function validateTopicInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const topic = req.body?.topic;

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    logger.debug("Middleware", "Missing topic in request body");
    res.status(400).json({
      success: false,
      error: "Topic is required. Please provide a subject you'd like to study.",
    });
    return;
  }

  const trimmed = topic.trim();

  // Basic length check
  if (trimmed.length < 2) {
    res.status(400).json({
      success: false,
      error: "Topic is too short. Please provide a meaningful subject.",
    });
    return;
  }

  if (trimmed.length > 500) {
    res.status(400).json({
      success: false,
      error: "Topic is too long. Please keep it under 500 characters.",
    });
    return;
  }

  // Full validation — catches personal questions, spam, casual chat
  const result = inputValidationService.validate(trimmed);
  if (!result.isValid) {
    logger.debug("Middleware", "Topic rejected by validation", {
      reason: result.reason,
      rejectionType: result.rejectionType,
      topic: trimmed.slice(0, 60),
    });
    res.status(400).json({
      success: false,
      error: result.reason,
    });
    return;
  }

  // Sanitize and pass through
  req.body.topic = result.sanitized || trimmed;
  next();
}

/**
 * Validates the `query` field in request body for question-answering endpoints.
 * Uses the full inputValidationService for thorough checking.
 */
export function validateQueryInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const query = req.body?.query;

  if (!query || typeof query !== "string" || !query.trim()) {
    res.status(400).json({
      success: false,
      error: "Please provide a question you'd like answered.",
    });
    return;
  }

  const result = inputValidationService.validate(query);

  if (!result.isValid) {
    logger.debug("Middleware", "Query rejected by validation", {
      reason: result.reason,
      rejectionType: result.rejectionType,
    });
    res.status(400).json({
      success: false,
      error: result.reason,
    });
    return;
  }

  // Replace with sanitized version
  req.body.query = result.sanitized || query.trim();
  next();
}

// Re-export existing utilities
export { paginate, validateEmail, validatePassword, sanitizeInput } from "./validation";
