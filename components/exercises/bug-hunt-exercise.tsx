"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { BugHuntExercise } from "@/lib/types";
import type { ExerciseComponentProps } from "./exercise-renderer";

export function BugHuntExerciseComponent({ exercise, progress, onSelfGrade, onAnswerInChat }: ExerciseComponentProps) {
  const ex = exercise as BugHuntExercise;
  const lines = useMemo(() => ex.code.split("\n"), [ex.code]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(progress?.status === "completed" || progress?.status === "attempted");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  function handleLineClick(lineNum: number) {
    if (submitted) return;
    setSelectedLine(lineNum);
    const correct = lineNum === ex.bugLine;
    setIsCorrect(correct);
    setSubmitted(true);
    onSelfGrade(ex.id, correct);
  }

  return (
    <div>
      <div className="text-[13px] text-zinc-400 leading-relaxed mb-4 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]">
        <ReactMarkdown>{ex.prompt}</ReactMarkdown>
      </div>

      <p className="text-[11px] text-zinc-600 mb-2">Click the line that contains the bug:</p>

      <div className="bg-zinc-900/60 rounded overflow-x-auto font-mono text-[13px] leading-relaxed">
        {lines.map((line, i) => {
          const lineNum = i + 1;
          const isSelected = selectedLine === lineNum;
          const isBugLine = submitted && lineNum === ex.bugLine;

          let bg = "hover:bg-zinc-800/40 cursor-pointer";
          if (submitted) {
            if (isBugLine) {
              bg = isCorrect ? "bg-emerald-950/30" : "bg-amber-950/30";
            } else if (isSelected && !isCorrect) {
              bg = "bg-red-950/20";
            } else {
              bg = "";
            }
            bg += " cursor-default";
          }

          return (
            <div
              key={i}
              onClick={() => handleLineClick(lineNum)}
              className={`flex px-4 py-0.5 ${bg} transition-colors`}
            >
              <span className="text-zinc-700 w-8 text-right mr-4 shrink-0 select-none">{lineNum}</span>
              <span className={`${isBugLine ? "text-zinc-200" : "text-zinc-400"} whitespace-pre`}>{line || " "}</span>
              {submitted && isBugLine && (
                <span className="ml-auto text-[10px] text-amber-500 shrink-0 pl-4">bug</span>
              )}
              {submitted && isSelected && !isCorrect && lineNum !== ex.bugLine && (
                <span className="ml-auto text-[10px] text-red-500 shrink-0 pl-4">your pick</span>
              )}
            </div>
          );
        })}
      </div>

      {submitted && isCorrect && (
        <div className="mt-3">
          <p className="text-[12px] text-emerald-500/80 mb-1">Correct — you found the bug.</p>
          <p className="text-[12px] text-zinc-400">{ex.bugExplanation}</p>
        </div>
      )}
      {submitted && isCorrect === false && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[12px] text-red-400/80">The bug is on a different line.</p>
          <p className="text-[12px] text-zinc-500">{ex.bugExplanation}</p>
          <button
            onClick={() => onAnswerInChat(exercise)}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Still stuck? Discuss in chat &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
