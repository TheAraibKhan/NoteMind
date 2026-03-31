import express, { Router } from "express";
import * as notesController from "@/controllers/notes";
import { authMiddleware, optionalAuth } from "@/middleware/auth";
import { validateTopicInput, validateQueryInput } from "@/middleware/aiValidation";
import { aiRateLimitMiddleware } from "@/middleware/rateLimit";

const router: Router = express.Router();

// AI generation routes (with input validation + AI rate limiting)
router.post(
  "/generate",
  optionalAuth,
  aiRateLimitMiddleware(),
  validateTopicInput,
  notesController.generateNotes,
);

router.post(
  "/ask",
  optionalAuth,
  aiRateLimitMiddleware(),
  validateQueryInput,
  notesController.answerQuestion,
);

// CRUD routes (auth required)
router.get("/", authMiddleware, notesController.getNotes);
router.get("/:id", authMiddleware, notesController.getNoteById);
router.delete("/:id", authMiddleware, notesController.deleteNote);

export default router;
