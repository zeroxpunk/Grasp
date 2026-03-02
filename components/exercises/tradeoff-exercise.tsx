"use client";

import type { TradeoffExercise as TradeoffExerciseType } from "@/lib/types";
import { ExercisePrompt } from "./exercise-prompt";
import type { ExerciseComponentProps } from "./exercise-renderer";

export function TradeoffExerciseComponent({ exercise, codeHtml, onAnswerInChat }: ExerciseComponentProps) {
  const ex = exercise as TradeoffExerciseType;

  return (
    <div>
      <ExercisePrompt>{ex.prompt}</ExercisePrompt>

      {ex.code && (
        <div className="mb-4">
          {codeHtml ? (
            <div
              className="text-[13px] [&_pre]:!bg-zinc-900/60 [&_pre]:!p-3 [&_pre]:rounded [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: codeHtml }}
            />
          ) : (
            <pre className="bg-zinc-900/60 p-3 rounded text-[12px] text-zinc-400 overflow-x-auto whitespace-pre">
              <code>{ex.code}</code>
            </pre>
          )}
        </div>
      )}

      <button
        onClick={() => onAnswerInChat(exercise)}
        className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Answer in chat &rarr;
      </button>
    </div>
  );
}
