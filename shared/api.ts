/**
 * Shared types for the Quiz application
 */

export type ID = string;

export interface QuizOption {
  id: ID;
  text: string;
  correct?: boolean; // only sent to admin/host
}

export interface QuizQuestion {
  id: ID;
  text: string;
  options: QuizOption[];
  timerSec: number;
}

export type QuizStatus = "draft" | "live" | "ended";

export interface QuizSummary {
  id: ID;
  code: string;
  title: string;
  status: QuizStatus;
  createdAt: number;
  updatedAt: number;
  questionCount: number;
}

export interface Quiz extends QuizSummary {
  questions: QuizQuestion[];
}

export interface Player {
  id: ID;
  name: string;
  score: number;
  correctCount: number;
  lastAnswerAt?: number;
}

export interface LeaderboardEntry {
  playerId: ID;
  name: string;
  score: number;
  correctCount: number;
}

export interface LiveState {
  quizId: ID;
  code: string;
  status: QuizStatus;
  currentQuestionIndex: number; // -1 when not started
  // question options may include `correct` when answers are revealed
  question?: Omit<QuizQuestion, "options"> & { options: { id: ID; text: string; correct?: boolean }[] };
  revealAnswers?: boolean;
  deadline?: number; // epoch ms for current question deadline
  leaderboard: LeaderboardEntry[];
}

// Admin API payloads
export interface CreateQuizInput {
  title: string;
  questions: { text: string; timerSec: number; options: { text: string; correct?: boolean }[] }[];
}

export interface UpdateQuizInput extends CreateQuizInput {}

export interface JoinQuizInput { name: string }
export interface JoinQuizResponse { quizId: ID; playerId: ID; code: string; title: string }

export interface AnswerInput {
  playerId: ID;
  questionId: ID;
  optionId: ID;
}

export interface StartQuizResponse extends LiveState {}

// SSE event types
export type LiveEvent =
  | { type: "heartbeat"; now: number }
  | { type: "quiz_started"; state: LiveState }
  | { type: "quiz_stopped"; state: LiveState }
  | { type: "question"; state: LiveState }
  | { type: "leaderboard"; state: LiveState }
  | { type: "result"; state: LiveState };
