import express, { Router } from "express";
import * as flashcardController from "@/controllers/flashcards";
import { authMiddleware, optionalAuth } from "@/middleware/auth";
import { validateTopicInput } from "@/middleware/aiValidation";
import { aiRateLimitMiddleware } from "@/middleware/rateLimit";

const router: Router = express.Router();

// AI generation route (with validation + AI rate limiting)
router.post(
  "/generate",
  optionalAuth,
  aiRateLimitMiddleware(),
  validateTopicInput,
  flashcardController.generateFlashcards,
);

// CRUD routes (auth required)
router.get("/", authMiddleware, flashcardController.getFlashcards);
router.patch(
  "/:flashcardId/card/:cardIndex",
  authMiddleware,
  flashcardController.updateFlashcardMastery,
);

export default router;
