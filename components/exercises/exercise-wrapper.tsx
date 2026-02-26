"use client";

import { useState } from "react";
import type { Exercise, ExerciseProgress } from "@/lib/types";

interface ExerciseWrapperProps {
  exercise: Exercise;
  progress?: ExerciseProgress;
  children: React.ReactNode;
}

export function ExerciseWrapper({ exercise, progress, children }: ExerciseWrapperProps) {
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const hints = "hints" in exercise ? exercise.hints : undefined;
  const hasHints = hints && hints.length > 0;
  const canRevealMore = hasHints && hintsRevealed < hints!.length;

  const leftBorder = progress?.status === "completed"
    ? "border-l-emerald-600"
    : progress?.status === "attempted"
      ? "border-l-red-700"
      : "border-l-zinc-700";

  return (
    <div className={`border border-zinc-800/60 ${leftBorder} border-l-2 rounded-lg p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-zinc-300">{exercise.title}</h4>
        {hasHints && canRevealMore && (
          <button
            onClick={() => setHintsRevealed((h) => h + 1)}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Hint {hintsRevealed + 1}/{hints!.length}
          </button>
        )}
      </div>

      {children}

      {hasHints && hintsRevealed > 0 && (
        <div className="mt-4 space-y-2">
          {hints!.slice(0, hintsRevealed).map((hint, i) => (
            <div key={i} className="text-[12px] text-zinc-500 pl-3 border-l border-zinc-800">
              <span className="text-zinc-600 mr-1">Hint {i + 1}:</span> {hint}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

