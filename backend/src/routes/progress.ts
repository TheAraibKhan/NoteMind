import express, { Router } from "express";
import * as progressController from "@/controllers/progress";
import { authMiddleware } from "@/middleware/auth";

const router: Router = express.Router();

router.get("/", authMiddleware, progressController.getProgress);
router.get(
  "/topic/:topic",
  authMiddleware,
  progressController.getTopicProgress,
);
router.get("/weak-topics", authMiddleware, progressController.getWeakTopics);
router.get("/streak", authMiddleware, progressController.getLearningStreak);

export default router;
