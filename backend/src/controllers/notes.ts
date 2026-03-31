import { Request, Response } from 'express';
import Note from '@/models/Note';
import { generateNotesContent } from '@/services/aiService';

interface NotesRequest extends Request {
  userId?: string;
  body: {
    topic: string;
  };
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const generateNotes = async (
  req: NotesRequest,
  res: Response
): Promise<void> => {
  try {
    const topic = req.body.topic?.trim();
    const userId = req.userId;

    if (!topic) {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    // Generate notes using AI service
    const content = await generateNotesContent(topic);

    const sections = Object.keys(content).length;

    if (!userId) {
      res.status(201).json({
        id: null,
        topic,
        content,
        sections,
        saved: false,
      });
      return;
    }

    // Save to database for authenticated users
    const note = new Note({
      topic,
      userId,
      content,
      sections,
    });

    await note.save();

    res.status(201).json({
      id: note._id,
      topic: note.topic,
      content: note.content,
      sections: note.sections,
      saved: true,
    });
  } catch (error) {
    console.error("Failed to generate notes:", error);
    res.status(500).json({
      error: "Failed to generate notes",
      details:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
};

export const getNotes = async (
  req: NotesRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    const { topic } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const query: { userId: string; topic?: RegExp } = { userId };
    if (typeof topic === 'string' && topic.trim()) {
      query.topic = new RegExp(escapeRegex(topic.trim()), 'i');
    }

    const notes = await Note.find(query).sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const getNoteById = async (
  req: NotesRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const note = await Note.findById(id);

    if (!note || note.userId.toString() !== userId) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch note' });
  }
};

export const deleteNote = async (
  req: NotesRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const note = await Note.findById(id);

    if (!note || note.userId.toString() !== userId) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    await note.deleteOne();

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
};
