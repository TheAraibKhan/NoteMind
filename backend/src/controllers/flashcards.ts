import { Request, Response } from "express";
import Flashcard from "@/models/Flashcard";
import { generateFlashcards as generateFlashcardsAI } from "@/services/aiService";
import { logger } from "@/utils/logger";

// ============================================================================
// TYPES
// ============================================================================

interface FlashcardRequest extends Request {
  userId?: string;
  body: {
    topic: string;
    noteId?: string;
    cardIndex?: number;
    mastered?: boolean;
  };
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ============================================================================
// GENERATE FLASHCARDS
// ============================================================================

export const generateFlashcards = async (
  req: FlashcardRequest,
  res: Response,
): Promise<void> => {
  const requestId = (req as any).id || "unknown";

  try {
    // Topic already validated by middleware
    const topic = req.body.topic?.trim();
    const { noteId } = req.body;
    const userId = req.userId;

    if (!topic) {
      res.status(400).json({ success: false, error: "Topic is required" });
      return;
    }

    logger.info("FlashcardsController", "Generating flashcards", {
      topic: topic.slice(0, 60),
      authenticated: !!userId,
      requestId,
    });

    const timer = logger.startTimer("FlashcardsController", "generateFlashcards");
    const result = await generateFlashcardsAI(topic);
    timer.done({ success: result.success, cached: result.cached ?? false });

    if (!result.success || !result.data) {
      const statusCode =
        result.error?.includes("temporarily") || result.error?.includes("unavailable")
          ? 503
          : 500;
      res.status(statusCode).json({
        success: false,
        error: result.error || "Failed to generate flashcards. Please try again.",
        requestId,
      });
      return;
    }

    const cards = result.data;

    // Unauthenticated — return without saving
    if (!userId) {
      res.status(201).json({
        success: true,
        id: null,
        topic,
        cards,
        totalCards: cards.length,
        saved: false,
        cached: result.cached || false,
      });
      return;
    }

    // Save for authenticated users
    try {
      const flashcard = new Flashcard({
        topic,
        userId,
        noteId: noteId || null,
        cards,
      });

      const savedFlashcard = await flashcard.save();
      logger.info("FlashcardsController", "Flashcards saved", {
        flashcardId: savedFlashcard._id,
        cardCount: cards.length,
      });

      res.status(201).json({
        success: true,
        id: savedFlashcard._id,
        topic: savedFlashcard.topic,
        cards: savedFlashcard.cards,
        totalCards: savedFlashcard.cards.length,
        saved: true,
        cached: result.cached || false,
      });
    } catch (dbError) {
      logger.error("FlashcardsController", "Failed to save flashcards to DB", dbError as Error);
      res.status(201).json({
        success: true,
        id: null,
        topic,
        cards,
        totalCards: cards.length,
        saved: false,
        cached: result.cached || false,
        warning: "Flashcards generated but could not be saved.",
      });
    }
  } catch (error) {
    logger.error("FlashcardsController", "Unhandled error in generateFlashcards", error as Error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
};

// ============================================================================
// GET FLASHCARDS LIST
// ============================================================================

export const getFlashcards = async (
  req: FlashcardRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    const { topic } = req.query;

    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const query: { userId: string; topic?: RegExp } = { userId };
    if (typeof topic === "string" && topic.trim()) {
      query.topic = new RegExp(escapeRegex(topic.trim()), "i");
    }

    const flashcards = await Flashcard.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: flashcards });
  } catch (error) {
    logger.error("FlashcardsController", "Failed to fetch flashcards", error as Error);
    res.status(500).json({ success: false, error: "Failed to fetch flashcards" });
  }
};

// ============================================================================
// UPDATE FLASHCARD MASTERY
// ============================================================================

export const updateFlashcardMastery = async (
  req: FlashcardRequest,
  res: Response,
): Promise<void> => {
  try {
    const { flashcardId } = req.params;
    const cardIndex = Number(req.params.cardIndex);
    const { mastered } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    if (!Number.isInteger(cardIndex) || typeof mastered !== "boolean") {
      res.status(400).json({
        success: false,
        error: "cardIndex (integer) and mastered (boolean) are required",
      });
      return;
    }

    const flashcard = await Flashcard.findOne({ _id: flashcardId, userId });
    if (!flashcard) {
      res.status(404).json({ success: false, error: "Flashcard set not found" });
      return;
    }

    if (cardIndex < 0 || cardIndex >= flashcard.cards.length) {
      res.status(400).json({
        success: false,
        error: `Card index must be between 0 and ${flashcard.cards.length - 1}`,
      });
      return;
    }

    flashcard.cards[cardIndex].mastered = mastered;
    await flashcard.save();

    logger.info("FlashcardsController", "Flashcard mastery updated", {
      flashcardId,
      cardIndex,
      mastered,
    });

    res.json({ success: true, data: flashcard });
  } catch (error) {
    logger.error("FlashcardsController", "Failed to update flashcard mastery", error as Error);
    res.status(500).json({ success: false, error: "Failed to update flashcard" });
  }
};
