export type LessonStatus =
  | "not_created"
  | "not_started"
  | "started"
  | "completed"
  | "failed";

export interface LessonEntry {
  number: number;
  slug: string;
  title: string;
  concepts: string[];
  status: LessonStatus;
}

export interface CourseManifest {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  lessons: LessonEntry[];
  mastery: Record<string, number>;
}

export type ExerciseType =
  | "text"
  | "quiz"
  | "flashcard"
  | "ordering"
  | "matching"
  | "code-completion"
  | "bug-hunt"
  | "output-prediction"
  | "tradeoff-analysis";

interface ExerciseBase {
  id: number;
  title: string;
  prompt: string;
}

export interface TextExercise extends ExerciseBase {
  type: "text";
  code?: string;
  language?: string;
  hints?: string[];
}

export interface QuizExercise extends ExerciseBase {
  type: "quiz";
  choices: { label: string; correct: boolean }[];
  hints?: string[];
}

export interface FlashcardExercise extends ExerciseBase {
  type: "flashcard";
  back: string;
}

export interface OrderingExercise extends ExerciseBase {
  type: "ordering";
  items: string[];
}

export interface MatchingExercise extends ExerciseBase {
  type: "matching";
  pairs: { left: string; right: string }[];
}

export interface CodeCompletionExercise extends ExerciseBase {
  type: "code-completion";
  codeTemplate: string;
  blanks: string[];
  language: string;
}

export interface BugHuntExercise extends ExerciseBase {
  type: "bug-hunt";
  code: string;
  language: string;
  bugLine: number;
  bugExplanation: string;
}

export interface OutputPredictionExercise extends ExerciseBase {
  type: "output-prediction";
  code: string;
  language: string;
  expectedOutput: string;
}

export interface TradeoffExercise extends ExerciseBase {
  type: "tradeoff-analysis";
  code?: string;
  language?: string;
  hints?: string[];
}

export type Exercise =
  | TextExercise
  | QuizExercise
  | FlashcardExercise
  | OrderingExercise
  | MatchingExercise
  | CodeCompletionExercise
  | BugHuntExercise
  | OutputPredictionExercise
  | TradeoffExercise;

export interface ExerciseProgress {
  status: "attempted" | "completed";
  attemptedAt: string;
}

export type StreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "exercise-status"; exerciseId: number; status: "attempted" | "completed" }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ExecutionOptions {
  onProgress?: () => void;
  maxOutputTokens?: number;
  thinkingBudget?: number;
}
