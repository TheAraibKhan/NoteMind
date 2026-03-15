import mongoose, { Schema, Document } from 'mongoose';

export interface IFlashcard extends Document {
  topic: string;
  userId: mongoose.Types.ObjectId;
  noteId?: mongoose.Types.ObjectId | null;
  cards: Array<{
    front: string;
    back: string;
    mastered: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const flashcardSchema = new Schema<IFlashcard>(
  {
    topic: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    noteId: { type: Schema.Types.ObjectId, ref: 'Note', required: false, default: null },
    cards: [
      {
        front: { type: String, required: true },
        back: { type: String, required: true },
        mastered: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

flashcardSchema.index({ userId: 1, topic: 1 });

export default mongoose.model<IFlashcard>('Flashcard', flashcardSchema);
