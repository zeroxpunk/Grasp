"use client";

import { useState } from "react";
import type { QuizExercise } from "@/lib/types";
import { ExercisePrompt } from "./exercise-prompt";
import type { ExerciseComponentProps } from "./exercise-renderer";

export function QuizExerciseComponent({ exercise, progress, onSelfGrade, onAnswerInChat }: ExerciseComponentProps) {
  const ex = exercise as QuizExercise;
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(progress?.status === "completed");

  const correctIndex = ex.choices.findIndex((c) => c.correct);

  function handleSelect(index: number) {
    if (submitted) return;
    setSelected(index);
    setSubmitted(true);
    const isCorrect = index === correctIndex;
    onSelfGrade(ex.id, isCorrect);
  }

  const isCorrect = selected === correctIndex;

  return (
    <div>
      <ExercisePrompt>{ex.prompt}</ExercisePrompt>

      <div className="space-y-2">
        {ex.choices.map((choice, i) => {
          let bg = "bg-transparent border-zinc-800 hover:border-zinc-600 cursor-pointer";
          if (submitted) {
            if (i === correctIndex) {
              bg = "bg-emerald-950/30 border-emerald-800/60 cursor-default";
            } else if (i === selected) {
              bg = "bg-red-950/30 border-red-900/60 cursor-default";
            } else {
              bg = "bg-transparent border-zinc-800/40 opacity-50 cursor-default";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={submitted}
              className={`w-full text-left px-4 py-2.5 rounded border text-[13px] transition-colors ${bg}`}
            >
              <span className="text-zinc-500 mr-2 font-mono text-[11px]">
                {String.fromCharCode(65 + i)}.
              </span>
              <span className={submitted && i === correctIndex ? "text-emerald-400" : "text-zinc-300"}>
                {choice.label}
              </span>
              {submitted && i === correctIndex && (
                <svg className="inline ml-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {submitted && !isCorrect && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[12px] text-red-400/80">
            Not quite. The correct answer is highlighted above.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSubmitted(false); setSelected(null); }}
              className="text-[12px] px-4 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => onAnswerInChat(exercise)}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Still stuck? Discuss in chat &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

