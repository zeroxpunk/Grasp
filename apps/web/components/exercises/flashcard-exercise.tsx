"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { FlashcardExercise } from "@/lib/types";
import type { ExerciseComponentProps } from "./exercise-renderer";

export function FlashcardExerciseComponent({ exercise, progress, onSelfGrade }: ExerciseComponentProps) {
  const ex = exercise as FlashcardExercise;
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState(progress?.status === "completed");

  function handleGrade(knew: boolean) {
    setGraded(true);
    onSelfGrade(ex.id, knew);
  }

  return (
    <div>
      <div
        className="flashcard-container cursor-pointer"
        onClick={() => !flipped && setFlipped(true)}
      >
        <div className={`flashcard ${flipped ? "flashcard-flipped" : ""}`}>
          <div className="flashcard-face flashcard-front rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 flex items-center justify-center min-h-[120px]">
            <div className="text-[13px] text-zinc-300 leading-relaxed text-center [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]">
              <ReactMarkdown>{ex.prompt}</ReactMarkdown>
              {!flipped && (
                <p className="text-[11px] text-zinc-600 mt-3">Click to reveal</p>
              )}
            </div>
          </div>
          <div className="flashcard-face flashcard-back rounded-lg border border-zinc-700 bg-zinc-800/40 p-6 flex items-center justify-center min-h-[120px]">
            <div className="text-[13px] text-zinc-200 leading-relaxed text-center [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-zinc-700/60 [&_code]:text-zinc-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]">
              <ReactMarkdown>{ex.back}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {flipped && !graded && (
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => handleGrade(true)}
            className="text-[12px] px-4 py-1.5 rounded border border-emerald-800/60 text-emerald-500 hover:bg-emerald-950/30 transition-colors"
          >
            I knew this
          </button>
          <button
            onClick={() => handleGrade(false)}
            className="text-[12px] px-4 py-1.5 rounded border border-red-900/60 text-red-400 hover:bg-red-950/30 transition-colors"
          >
            I didn&apos;t know this
          </button>
        </div>
      )}
    </div>
  );
}

