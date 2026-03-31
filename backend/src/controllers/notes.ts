import { Request, Response } from "express";
import Note from "@/models/Note";
import {
  generateNotesContent,
  answerStudyQuestion,
} from "@/services/aiService";
import { logger } from "@/utils/logger";

// ============================================================================
// TYPES
// ============================================================================

interface NotesRequest extends Request {
  userId?: string;
  body: {
    topic?: string;
    query?: string;
  };
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ============================================================================
// GENERATE NOTES
// ============================================================================

export const generateNotes = async (
  req: NotesRequest,
  res: Response,
): Promise<void> => {
  const requestId = (req as any).id || "unknown";

  try {
    // Topic is already validated by middleware, but guard just in case
    const topic = req.body.topic?.trim();
    const userId = req.userId;

    if (!topic) {
      res.status(400).json({ success: false, error: "Topic is required" });
      return;
    }

    logger.info("NotesController", "Generating notes", {
      topic: topic.slice(0, 60),
      authenticated: !!userId,
      requestId,
    });

    const timer = logger.startTimer("NotesController", "generateNotes");
    const result = await generateNotesContent(topic);
    timer.done({ success: result.success, cached: result.cached ?? false });

    if (!result.success || !result.data) {
      // Return appropriate status code based on error type
      const statusCode = result.error?.includes("temporarily") ? 503 : 500;
      res.status(statusCode).json({
        success: false,
        error: result.error || "Failed to generate notes. Please try again.",
        requestId,
      });
      return;
    }

    const sections = Object.keys(result.data).length;

    // Unauthenticated user — return without saving
    if (!userId) {
      res.status(201).json({
        success: true,
        id: null,
        topic,
        content: result.data,
        sections,
        saved: false,
        cached: result.cached || false,
      });
      return;
    }

    // Save to database for authenticated users
    try {
      const note = new Note({
        topic,
        userId,
        content: result.data,
        sections,
      });
      await note.save();

      logger.info("NotesController", "Notes saved to database", {
        noteId: note._id,
        topic: topic.slice(0, 50),
      });

      res.status(201).json({
        success: true,
        id: note._id,
        topic: note.topic,
        content: note.content,
        sections: note.sections,
        saved: true,
        cached: result.cached || false,
      });
    } catch (dbError) {
      // Database save failed, but we still have the content — return it unsaved
      logger.error("NotesController", "Failed to save notes to DB", dbError as Error);

      res.status(201).json({
        success: true,
        id: null,
        topic,
        content: result.data,
        sections,
        saved: false,
        cached: result.cached || false,
        warning: "Notes generated but could not be saved. They will not appear in your history.",
      });
    }
  } catch (error) {
    logger.error("NotesController", "Unhandled error in generateNotes", error as Error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
};

// ============================================================================
// GET NOTES LIST
// ============================================================================

export const getNotes = async (
  req: NotesRequest,
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

    const notes = await Note.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: notes });
  } catch (error) {
    logger.error("NotesController", "Failed to fetch notes", error as Error);
    res.status(500).json({ success: false, error: "Failed to fetch notes" });
  }
};

// ============================================================================
// GET NOTE BY ID
// ============================================================================

export const getNoteById = async (
  req: NotesRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const note = await Note.findById(id);

    if (!note || note.userId.toString() !== userId) {
      res.status(404).json({ success: false, error: "Note not found" });
      return;
    }

    res.json({ success: true, data: note });
  } catch (error) {
    logger.error("NotesController", "Failed to fetch note", error as Error);
    res.status(500).json({ success: false, error: "Failed to fetch note" });
  }
};

// ============================================================================
// DELETE NOTE
// ============================================================================

export const deleteNote = async (
  req: NotesRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const note = await Note.findById(id);

    if (!note || note.userId.toString() !== userId) {
      res.status(404).json({ success: false, error: "Note not found" });
      return;
    }

    await note.deleteOne();

    logger.info("NotesController", "Note deleted", { noteId: id });
    res.json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    logger.error("NotesController", "Failed to delete note", error as Error);
    res.status(500).json({ success: false, error: "Failed to delete note" });
  }
};

// ============================================================================
// ANSWER QUESTION
// ============================================================================

export const answerQuestion = async (
  req: NotesRequest,
  res: Response,
): Promise<void> => {
  const requestId = (req as any).id || "unknown";

  try {
    // Query is already validated by middleware
    const query = req.body.query;

    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({
        success: false,
        error: "Please provide a question.",
        requestId,
      });
      return;
    }

    const sanitized = query.trim();
    logger.info("NotesController", "Answering study question", {
      query: sanitized.slice(0, 60),
      requestId,
    });

    const timer = logger.startTimer("NotesController", "answerQuestion");
    const result = await answerStudyQuestion(sanitized);
    timer.done({ success: result.success, cached: result.cached ?? false });

    if (!result.success) {
      // Use 400 for input-level rejections, 503 for service issues
      const statusCode = result.error?.includes("temporarily") || result.error?.includes("busy")
        ? 503
        : 400;

      res.status(statusCode).json({
        success: false,
        error: result.error || "Unable to answer that question. Please try rephrasing.",
        query: sanitized,
        requestId,
      });
      return;
    }

    res.status(200).json({
      success: true,
      query: sanitized,
      response: result.data,
      cached: result.cached || false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("NotesController", "Unhandled error in answerQuestion", error as Error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
};
