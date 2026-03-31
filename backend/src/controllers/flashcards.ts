import { Request, Response } from "express";
import Flashcard from "@/models/Flashcard";
import { generateFlashcards as generateFlashcardsAI } from "@/services/aiService";

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

export const generateFlashcards = async (
  req: FlashcardRequest,
  res: Response,
): Promise<void> => {
  try {
    const topic = req.body.topic?.trim();
    const { noteId } = req.body;
    const userId = req.userId;

    if (!topic) {
      res.status(400).json({ error: "Topic is required" });
      return;
    }

    // Generate flashcard content
    const cards = await generateFlashcardsAI(topic);

    if (!userId) {
      res.status(201).json({
        id: null,
        topic,
        cards,
        totalCards: cards.length,
        saved: false,
      });
      return;
    }

    // Save flashcards for authenticated users
    const flashcard = new Flashcard({
      topic,
      userId,
      noteId: noteId || null,
      cards,
    });

    await flashcard.save();

    res.status(201).json({
      id: flashcard._id,
      topic: flashcard.topic,
      cards: flashcard.cards,
      totalCards: flashcard.cards.length,
      saved: true,
    });
  } catch (error) {
    console.error("Failed to generate flashcards:", error);
    res.status(500).json({
      error: "Failed to generate flashcards",
      details:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
};

export const getFlashcards = async (
  req: FlashcardRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    const { topic } = req.query;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const query: { userId: string; topic?: RegExp } = { userId };
    if (typeof topic === "string" && topic.trim()) {
      query.topic = new RegExp(escapeRegex(topic.trim()), "i");
    }

    const flashcards = await Flashcard.find(query).sort({ createdAt: -1 });

    res.json(flashcards);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
};

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
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!Number.isInteger(cardIndex) || typeof mastered !== "boolean") {
      res.status(400).json({ error: "cardIndex and mastered required" });
      return;
    }

    const flashcard = await Flashcard.findOne({ _id: flashcardId, userId });

    if (!flashcard) {
      res.status(404).json({ error: "Flashcard not found" });
      return;
    }

    if (cardIndex < 0 || cardIndex >= flashcard.cards.length) {
      res.status(400).json({ error: "Card index is out of range" });
      return;
    }

    flashcard.cards[cardIndex].mastered = mastered;
    await flashcard.save();

    res.json(flashcard);
  } catch (error) {
    console.error("Failed to update flashcard:", error);
    res.status(500).json({ error: "Failed to update flashcard" });
  }
};
