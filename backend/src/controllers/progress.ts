import { Request, Response } from "express";
import Progress from "@/models/Progress";

interface ProgressRequest extends Request {
  userId?: string;
}

const toDateKey = (value: Date): string => value.toISOString().slice(0, 10);

const addDays = (value: Date, amount: number): Date => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

export const getProgress = async (
  req: ProgressRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const progress = await Progress.find({ userId }).sort({ updatedAt: -1 });

    const stats = {
      totalTopics: progress.length,
      averageAccuracy:
        progress.length > 0
          ? (
              progress.reduce((sum, p) => sum + p.averageAccuracy, 0) /
              progress.length
            ).toFixed(2)
          : 0,
      totalQuizzes: progress.reduce((sum, p) => sum + p.quizzesTaken, 0),
      weakTopics: progress.filter((p) => p.weakTopic).map((p) => p.topic),
    };

    res.json({ stats, progress });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
};

export const getTopicProgress = async (
  req: ProgressRequest,
  res: Response,
): Promise<void> => {
  try {
    const { topic } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const progress = await Progress.findOne({ userId, topic });

    if (!progress) {
      res.status(404).json({ error: "No progress for this topic" });
      return;
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch topic progress" });
  }
};

export const getWeakTopics = async (
  req: ProgressRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const weakTopics = await Progress.find({
      userId,
      weakTopic: true,
    }).sort({ averageAccuracy: 1 });

    res.json(weakTopics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch weak topics" });
  }
};

export const getLearningStreak = async (
  req: ProgressRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const progress = await Progress.find({ userId }).sort({
      lastAttemptDate: -1,
    });

    if (!progress.length) {
      res.json({ streak: 0 });
      return;
    }

    const activityDates = new Set<string>();

    progress.forEach((entry) => {
      entry.attempts.forEach((attempt) => {
        activityDates.add(toDateKey(new Date(attempt.date)));
      });

      if (entry.lastAttemptDate) {
        activityDates.add(toDateKey(new Date(entry.lastAttemptDate)));
      }
    });

    const today = new Date();
    const todayKey = toDateKey(today);
    const yesterdayKey = toDateKey(addDays(today, -1));

    if (!activityDates.has(todayKey) && !activityDates.has(yesterdayKey)) {
      res.json({ streak: 0 });
      return;
    }

    let streak = 0;
    let cursor = activityDates.has(todayKey) ? today : addDays(today, -1);

    while (activityDates.has(toDateKey(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    }

    res.json({ streak });
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate learning streak" });
  }
};
