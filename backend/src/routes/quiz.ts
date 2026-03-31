import express, { Router } from "express";
import * as quizController from "@/controllers/quiz";
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
  quizController.generateQuiz,
);

// Quiz interaction routes (auth required)
router.post("/:quizId/submit", authMiddleware, quizController.submitQuizAnswer);
router.get("/:id", authMiddleware, quizController.getQuiz);

export default router;
