"use client";

import type { ComponentType } from "react";
import type { Exercise, ExerciseProgress, ExerciseType } from "@/lib/types";
import { ExerciseWrapper } from "./exercise-wrapper";
import { TextExercise } from "./text-exercise";
import { QuizExerciseComponent } from "./quiz-exercise";
import { FlashcardExerciseComponent } from "./flashcard-exercise";
import { OrderingExerciseComponent } from "./ordering-exercise";
import { MatchingExerciseComponent } from "./matching-exercise";
import { CodeCompletionExerciseComponent } from "./code-completion-exercise";
import { BugHuntExerciseComponent } from "./bug-hunt-exercise";
import { OutputPredictionExerciseComponent } from "./output-prediction-exercise";
import { TradeoffExerciseComponent } from "./tradeoff-exercise";

export interface ExerciseComponentProps {
  exercise: Exercise;
  codeHtml?: string;
  progress?: ExerciseProgress;
  onSelfGrade: (exerciseId: number, completed: boolean) => void;
  onAnswerInChat: (exercise: Exercise) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENTS: Record<ExerciseType, ComponentType<any>> = {
  text: TextExercise,
  quiz: QuizExerciseComponent,
  flashcard: FlashcardExerciseComponent,
  ordering: OrderingExerciseComponent,
  matching: MatchingExerciseComponent,
  "code-completion": CodeCompletionExerciseComponent,
  "bug-hunt": BugHuntExerciseComponent,
  "output-prediction": OutputPredictionExerciseComponent,
  "tradeoff-analysis": TradeoffExerciseComponent,
};

interface ExerciseRendererProps {
  exercise: Exercise;
  codeHtml?: string;
  progress?: ExerciseProgress;
  onSelfGrade: (exerciseId: number, completed: boolean) => void;
  onAnswerInChat: (exercise: Exercise) => void;
}

export function ExerciseRenderer({ exercise, codeHtml, progress, onSelfGrade, onAnswerInChat }: ExerciseRendererProps) {
  const Component = COMPONENTS[exercise.type] ?? COMPONENTS.text;

  return (
    <ExerciseWrapper exercise={exercise} progress={progress}>
      <Component
        exercise={exercise}
        codeHtml={codeHtml}
        progress={progress}
        onSelfGrade={onSelfGrade}
        onAnswerInChat={onAnswerInChat}
      />
    </ExerciseWrapper>
  );
}
