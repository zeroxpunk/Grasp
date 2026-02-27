"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { OrderingExercise } from "@/lib/types";
import type { ExerciseComponentProps } from "./exercise-renderer";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function OrderingExerciseComponent({ exercise, progress, onSelfGrade, onAnswerInChat }: ExerciseComponentProps) {
  const ex = exercise as OrderingExercise;
  const [items, setItems] = useState<string[]>(() => {
    const shuffled = shuffle(ex.items);
    if (shuffled.every((s, i) => s === ex.items[i]) && shuffled.length > 1) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    return shuffled;
  });
  const [submitted, setSubmitted] = useState(progress?.status === "completed" || progress?.status === "attempted");
  const [results, setResults] = useState<boolean[] | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const moveItem = useCallback((from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  }, [items.length]);

  function handleSubmit() {
    const res = items.map((item, i) => item === ex.items[i]);
    setResults(res);
    setSubmitted(true);
    const allCorrect = res.every(Boolean);
    onSelfGrade(ex.id, allCorrect);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragging(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(index);
  }

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (!isNaN(fromIndex) && fromIndex !== targetIndex) {
      moveItem(fromIndex, targetIndex);
    }
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div>
      <div className="text-[13px] text-zinc-400 leading-relaxed mb-4 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]">
        <ReactMarkdown>{ex.prompt}</ReactMarkdown>
      </div>

      {!submitted && (
        <p className="text-[11px] text-zinc-600 mb-2">Drag to reorder:</p>
      )}

      <div className="space-y-1.5 mb-4">
        {items.map((item, i) => {
          let itemBg = "border-zinc-800 bg-zinc-900/30";
          if (submitted && results) {
            itemBg = results[i]
              ? "border-emerald-800/60 bg-emerald-950/20"
              : "border-red-900/50 bg-red-950/20";
          }
          const isDragging = dragging === i;
          const isDragOver = dragOver === i && dragging !== i;

          return (
            <div
              key={`${item}-${i}`}
              className={`flex items-center gap-3 px-3 py-2 rounded border ${itemBg} transition-all ${
                !submitted ? "cursor-grab active:cursor-grabbing" : ""
              } ${isDragging ? "opacity-40" : ""} ${isDragOver ? "border-zinc-500" : ""}`}
              draggable={!submitted}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={() => { setDragging(null); setDragOver(null); }}
              onDragLeave={() => dragOver === i && setDragOver(null)}
            >
              {!submitted && (
                <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" className="text-zinc-700 shrink-0">
                  <circle cx="3" cy="2" r="1.2" />
                  <circle cx="7" cy="2" r="1.2" />
                  <circle cx="3" cy="7" r="1.2" />
                  <circle cx="7" cy="7" r="1.2" />
                  <circle cx="3" cy="12" r="1.2" />
                  <circle cx="7" cy="12" r="1.2" />
                </svg>
              )}

              <span className="text-[11px] text-zinc-600 font-mono w-5 text-right shrink-0">{i + 1}.</span>
              <span className="text-[13px] text-zinc-300 flex-1">{item}</span>

              {submitted && results && (
                results[i] ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          className="text-[12px] px-4 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
        >
          Check order
        </button>
      )}

      {submitted && results && (
        <div className="mt-2 space-y-1.5">
          <p className={`text-[12px] ${results.every(Boolean) ? "text-emerald-500/80" : "text-red-400/80"}`}>
            {results.every(Boolean)
              ? "All in the correct order."
              : `${results.filter(Boolean).length}/${results.length} in the correct position.`}
          </p>
          {!results.every(Boolean) && (
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

