"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { MatchingExercise } from "@/lib/types";
import type { ExerciseComponentProps } from "./exercise-renderer";

const PAIR_COLORS = [
  { bg: "bg-blue-950/30", border: "border-blue-800/60", text: "text-blue-400", label: "1" },
  { bg: "bg-emerald-950/30", border: "border-emerald-800/60", text: "text-emerald-400", label: "2" },
  { bg: "bg-purple-950/30", border: "border-purple-800/60", text: "text-purple-400", label: "3" },
  { bg: "bg-amber-950/30", border: "border-amber-800/60", text: "text-amber-400", label: "4" },
  { bg: "bg-rose-950/30", border: "border-rose-800/60", text: "text-rose-400", label: "5" },
  { bg: "bg-cyan-950/30", border: "border-cyan-800/60", text: "text-cyan-400", label: "6" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MatchingExerciseComponent({ exercise, progress, onSelfGrade, onAnswerInChat }: ExerciseComponentProps) {
  const ex = exercise as MatchingExercise;

  const shuffledLeft = useMemo(() => shuffle(ex.pairs.map((p) => p.left)), [ex.pairs]);
  const shuffledRight = useMemo(() => shuffle(ex.pairs.map((p) => p.right)), [ex.pairs]);

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Map<number, number>>(new Map());
  const [submitted, setSubmitted] = useState(progress?.status === "completed" || progress?.status === "attempted");
  const [results, setResults] = useState<Map<number, boolean> | null>(null);

  const matchedRightIndices = new Set(matches.values());

  function handleLeftClick(idx: number) {
    if (submitted) return;
    if (matches.has(idx)) {
      setMatches((prev) => {
        const next = new Map(prev);
        next.delete(idx);
        return next;
      });
      return;
    }
    setSelectedLeft(idx);
  }

  function handleRightClick(idx: number) {
    if (submitted || selectedLeft === null) return;
    if (matchedRightIndices.has(idx)) return;

    setMatches((prev) => {
      const next = new Map(prev);
      next.set(selectedLeft, idx);
      return next;
    });
    setSelectedLeft(null);
  }

  function getPairIndex(leftIdx: number): number | null {
    if (!matches.has(leftIdx)) return null;
    const entries = Array.from(matches.entries());
    return entries.findIndex(([l]) => l === leftIdx);
  }

  function getRightPairIndex(rightIdx: number): number | null {
    const entries = Array.from(matches.entries());
    const entry = entries.findIndex(([, r]) => r === rightIdx);
    return entry >= 0 ? entry : null;
  }

  function handleSubmit() {
    const res = new Map<number, boolean>();
    matches.forEach((rightIdx, leftIdx) => {
      const leftVal = shuffledLeft[leftIdx];
      const rightVal = shuffledRight[rightIdx];
      const correct = ex.pairs.some((p) => p.left === leftVal && p.right === rightVal);
      res.set(leftIdx, correct);
    });
    setResults(res);
    setSubmitted(true);
    const allCorrect = res.size === ex.pairs.length && Array.from(res.values()).every(Boolean);
    onSelfGrade(ex.id, allCorrect);
  }

  const allCorrect = results ? Array.from(results.values()).every(Boolean) : false;

  return (
    <div>
      <div className="text-[13px] text-zinc-400 leading-relaxed mb-4 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]">
        <ReactMarkdown>{ex.prompt}</ReactMarkdown>
      </div>

      {!submitted && selectedLeft === null && (
        <p className="text-[11px] text-zinc-600 mb-2">Click a left item, then its match on the right:</p>
      )}
      {!submitted && selectedLeft !== null && (
        <p className="text-[11px] text-zinc-500 mb-2">Now click the matching item on the right.</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1.5">
          {shuffledLeft.map((item, i) => {
            const pairIdx = getPairIndex(i);
            const color = pairIdx !== null ? PAIR_COLORS[pairIdx % PAIR_COLORS.length] : null;
            const isSelected = selectedLeft === i;
            const resultOk = results?.get(i);

            let border = "border-zinc-800";
            let bg = "";
            if (submitted && resultOk !== undefined) {
              border = resultOk ? "border-emerald-800/60" : "border-red-900/50";
              bg = resultOk ? "bg-emerald-950/20" : "bg-red-950/20";
            } else if (color) {
              border = color.border;
              bg = color.bg;
            } else if (isSelected) {
              border = "border-zinc-500";
              bg = "bg-zinc-800/40";
            }

            return (
              <button
                key={i}
                onClick={() => handleLeftClick(i)}
                disabled={submitted}
                className={`w-full text-left px-3 py-2 rounded border ${border} ${bg} text-[13px] text-zinc-300 transition-colors ${!submitted ? "hover:border-zinc-600" : "cursor-default"}`}
              >
                <span className="flex items-center gap-2">
                  {color && (
                    <span className={`text-[10px] font-mono ${color.text} border ${color.border} rounded px-1`}>
                      {color.label}
                    </span>
                  )}
                  {item}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          {shuffledRight.map((item, i) => {
            const pairIdx = getRightPairIndex(i);
            const color = pairIdx !== null ? PAIR_COLORS[pairIdx % PAIR_COLORS.length] : null;
            const isTaken = matchedRightIndices.has(i);

            let border = "border-zinc-800";
            let bg = "";
            if (submitted && pairIdx !== null) {
              const leftIdx = Array.from(matches.entries()).find(([, r]) => r === i)?.[0];
              const ok = leftIdx !== undefined ? results?.get(leftIdx) : undefined;
              border = ok ? "border-emerald-800/60" : "border-red-900/50";
              bg = ok ? "bg-emerald-950/20" : "bg-red-950/20";
            } else if (color) {
              border = color.border;
              bg = color.bg;
            }

            return (
              <button
                key={i}
                onClick={() => handleRightClick(i)}
                disabled={submitted || (isTaken && selectedLeft === null)}
                className={`w-full text-left px-3 py-2 rounded border ${border} ${bg} text-[13px] text-zinc-300 transition-colors ${!submitted && selectedLeft !== null && !isTaken ? "hover:border-zinc-500" : ""} ${submitted ? "cursor-default" : ""}`}
              >
                <span className="flex items-center gap-2">
                  {color && (
                    <span className={`text-[10px] font-mono ${color.text} border ${color.border} rounded px-1`}>
                      {color.label}
                    </span>
                  )}
                  {item}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={matches.size < ex.pairs.length}
          className="text-[12px] px-4 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Check matches
        </button>
      )}

      {submitted && results && (
        <div className="mt-2 space-y-1.5">
          <p className={`text-[12px] ${allCorrect ? "text-emerald-500/80" : "text-red-400/80"}`}>
            {allCorrect
              ? "All pairs matched correctly."
              : `${Array.from(results.values()).filter(Boolean).length}/${results.size} pairs correct.`}
          </p>
          {!allCorrect && (
            <button
              onClick={() => onAnswerInChat(exercise)}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Still stuck? Discuss in chat &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

