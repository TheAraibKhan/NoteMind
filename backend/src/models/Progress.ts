import mongoose, { Schema, Document } from 'mongoose';

export interface IProgress extends Document {
  userId: mongoose.Types.ObjectId;
  topic: string;
  quizzesTaken: number;
  averageAccuracy: number;
  attempts: Array<{
    score: number;
    totalQuestions: number;
    date: Date;
    accuracy: number;
  }>;
  lastAttemptDate?: Date;
  weakTopic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const progressSchema = new Schema<IProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    quizzesTaken: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 },
    attempts: [
      {
        score: Number,
        totalQuestions: Number,
        date: { type: Date, default: Date.now },
        accuracy: Number,
      },
    ],
    lastAttemptDate: Date,
    weakTopic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, topic: 1 });
progressSchema.index({ userId: 1, weakTopic: 1 });

export default mongoose.model<IProgress>('Progress', progressSchema);
