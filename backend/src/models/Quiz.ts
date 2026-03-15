import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface IQuiz extends Document {
  topic: string;
  userId: mongoose.Types.ObjectId;
  noteId?: mongoose.Types.ObjectId | null;
  questions: IQuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const quizQuestionSchema = new Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: Number, required: true },
  explanation: { type: String, required: true },
});

const quizSchema = new Schema<IQuiz>(
  {
    topic: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    noteId: { type: Schema.Types.ObjectId, ref: 'Note', required: false, default: null },
    questions: [quizQuestionSchema],
  },
  { timestamps: true }
);

quizSchema.index({ userId: 1, topic: 1 });
quizSchema.index({ createdAt: -1 });

export default mongoose.model<IQuiz>('Quiz', quizSchema);
