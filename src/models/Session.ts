// src/models/Session.ts
import mongoose, { Document, Model, Schema } from "mongoose";

// Sub-document schemas
const QuestionSchema = new Schema({
  text: { type: String, required: true },
  order: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ResponseSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true },
  fillerWordsCount: { type: Number, default: 0 },
  fillerWordsFound: [{ type: String }],
  wordCount: { type: Number, default: 0 },
  order: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const FeedbackSchema = new Schema({
  overallScore: { type: Number, min: 0, max: 100 },
  confidenceScore: { type: Number, min: 0, max: 100 },
  clarityScore: { type: Number, min: 0, max: 100 },
  fillerWordScore: { type: Number, min: 0, max: 100 },
  sentiment: {
    type: String,
    enum: ["Positive", "Neutral", "Mixed", "Negative"],
    default: "Neutral",
  },
  communicationStyle: { type: String, default: "" },
  summary: { type: String, default: "" },
  strengths: [{ type: String }],
  improvements: [{ type: String }],
  fillerWordsFound: [{ type: String }],
  tips: { type: String, default: "" },
  generatedAt: { type: Date, default: Date.now },
});

export interface ISessionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: string;
  difficulty: string;
  role?: string;
  numQuestionsTarget: number;
  questions: mongoose.Types.DocumentArray<mongoose.Document & {
    text: string;
    order: number;
    createdAt: Date;
  }>;
  responses: mongoose.Types.DocumentArray<mongoose.Document & {
    questionId: string;
    questionText: string;
    answerText: string;
    fillerWordsCount: number;
    fillerWordsFound: string[];
    wordCount: number;
    order: number;
    createdAt: Date;
  }>;
  feedback?: {
    overallScore: number;
    confidenceScore: number;
    clarityScore: number;
    fillerWordScore: number;
    sentiment: string;
    communicationStyle: string;
    summary: string;
    strengths: string[];
    improvements: string[];
    fillerWordsFound: string[];
    tips: string;
    generatedAt: Date;
  };
  status: "active" | "completed" | "abandoned";
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Technical", "HR", "Managerial", "Academic CS", "Product Manager", "General"],
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["beginner", "intermediate", "advanced"],
    },
    role: { type: String, default: "" },
    numQuestionsTarget: { type: Number, required: true, default: 5 },
    questions: [QuestionSchema],
    responses: [ResponseSchema],
    feedback: FeedbackSchema,
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
    },
    duration: { type: Number, default: 0 }, // seconds
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
SessionSchema.index({ userId: 1, createdAt: -1 });
SessionSchema.index({ userId: 1, status: 1 });

const Session: Model<ISessionDocument> =
  mongoose.models.Session ||
  mongoose.model<ISessionDocument>("Session", SessionSchema);

export default Session;
