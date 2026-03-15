import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  topic: string;
  userId: mongoose.Types.ObjectId;
  content: {
    definition?: string;
    keyConcepts?: string[];
    importantPoints?: string[];
    examples?: string[];
    examHighlights?: string[];
  };
  sections: number;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    topic: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: {
      definition: String,
      keyConcepts: [String],
      importantPoints: [String],
      examples: [String],
      examHighlights: [String],
    },
    sections: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Index for faster queries
noteSchema.index({ userId: 1, topic: 1 });
noteSchema.index({ createdAt: -1 });

export default mongoose.model<INote>("Note", noteSchema);
