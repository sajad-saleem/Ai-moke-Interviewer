// src/types/index.ts

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISession {
  _id: string;
  userId: string;
  category: InterviewCategory;
  difficulty: Difficulty;
  role?: string;
  questions: IQuestion[];
  responses: IResponse[];
  feedback?: IFeedback;
  status: SessionStatus;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuestion {
  _id: string;
  text: string;
  order: number;
  createdAt: Date;
}

export interface IResponse {
  _id: string;
  questionId: string;
  questionText: string;
  answerText: string;
  fillerWordsCount: number;
  fillerWordsFound: string[];
  wordCount: number;
  order: number;
  createdAt: Date;
}

export interface IFeedback {
  overallScore: number;
  confidenceScore: number;
  clarityScore: number;
  fillerWordScore: number;
  sentiment: Sentiment;
  communicationStyle: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  fillerWordsFound: string[];
  tips: string;
  generatedAt: Date;
}

export type InterviewCategory =
  | "Technical"
  | "HR"
  | "Managerial"
  | "Academic CS"
  | "Product Manager"
  | "General";

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type SessionStatus = "active" | "completed" | "abandoned";
export type Sentiment = "Positive" | "Neutral" | "Mixed" | "Negative";

export interface ChatMessage {
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

export interface StartSessionPayload {
  category: InterviewCategory;
  difficulty: Difficulty;
  role?: string;
  numQuestions: number;
}

export interface GenerateQuestionPayload {
  sessionId: string;
  previousQA?: { question: string; answer: string }[];
}

export interface SubmitResponsePayload {
  sessionId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  order: number;
}

export interface GenerateFeedbackPayload {
  sessionId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth types
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DashboardStats {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  totalQuestions: number;
  recentSessions: ISession[];
  categoryBreakdown: { category: string; count: number; avgScore: number }[];
}
