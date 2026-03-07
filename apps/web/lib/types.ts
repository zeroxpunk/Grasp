export type {
  CourseSummary,
  CourseManifest,
  LessonEntry,
  LessonDetail,
  AdjacentLesson,
  ExerciseItem,
  ExerciseProgressEntry,
  SessionStats,
  InsightEntry,
  EvaluationResult,
  ChatMessage,
  ChatInputMessage,
  StreamChatRequest,
  Job,
  JobStatus,
  GenerateImageResponse,
} from "@grasp/api-client";

// ── Exercise types (rich discriminated union for UI rendering) ──

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

/**
 * Convert api-client ExerciseItem (flat data bag) to the rich Exercise union type.
 */
export function toExercise(item: import("@grasp/api-client").ExerciseItem): Exercise {
  return {
    id: item.id,
    type: item.type as ExerciseType,
    title: item.title,
    prompt: item.prompt,
    ...item.data,
  } as Exercise;
}
