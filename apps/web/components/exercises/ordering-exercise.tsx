"use client";

import { useState, useRef, useLayoutEffect, useCallback } from "react";
import type { OrderingExercise } from "@/lib/types";
import { ExercisePrompt } from "./exercise-prompt";
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
  const [submitted, setSubmitted] = useState(progress?.status === "completed");
  const [results, setResults] = useState<boolean[] | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  // FLIP animation refs
  const itemEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  const capturePositions = useCallback(() => {
    const rects = new Map<string, DOMRect>();
    itemEls.current.forEach((el, key) => {
      rects.set(key, el.getBoundingClientRect());
    });
    prevRects.current = rects;
  }, []);

  // After React re-renders with new item order, animate from old positions
  useLayoutEffect(() => {
    if (prevRects.current.size === 0) return;

    itemEls.current.forEach((el, key) => {
      const prev = prevRects.current.get(key);
      if (!prev) return;
      const curr = el.getBoundingClientRect();
      const dy = prev.top - curr.top;
      if (Math.abs(dy) < 1) return;

      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = "transform 200ms cubic-bezier(0.2, 0, 0, 1)";
          el.style.transform = "";
        });
      });
    });

    prevRects.current.clear();
  }, [items]);

  function handleSubmit() {
    const res = items.map((item, i) => item === ex.items[i]);
    setResults(res);
    setSubmitted(true);
    const allCorrect = res.every(Boolean);
    onSelfGrade(ex.id, allCorrect);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index;
    setDragging(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;

    // Midpoint check: only swap when cursor crosses the vertical center
    // of the target element — prevents the flicker feedback loop
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const from = dragIndexRef.current;
    if (from < index && e.clientY < midY) return;
    if (from > index && e.clientY > midY) return;

    capturePositions();
    setItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(index, 0, removed);
      return next;
    });
    dragIndexRef.current = index;
    setDragging(index);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragIndexRef.current = null;
    setDragging(null);
  }

  const setItemRef = useCallback((item: string, el: HTMLDivElement | null) => {
    if (el) {
      itemEls.current.set(item, el);
    } else {
      itemEls.current.delete(item);
    }
  }, []);

  return (
    <div>
      <ExercisePrompt>{ex.prompt}</ExercisePrompt>

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

          return (
            <div
              key={item}
              ref={(el) => setItemRef(item, el)}
              className={`relative flex items-center gap-3 px-3 py-2 rounded border ${itemBg} ${
                !submitted ? "cursor-grab active:cursor-grabbing" : ""
              } ${isDragging ? "opacity-50 scale-[1.03] shadow-lg shadow-black/25 z-10 ring-1 ring-zinc-600" : ""}`}
              draggable={!submitted}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={handleDrop}
              onDragEnd={() => { dragIndexRef.current = null; setDragging(null); }}
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setResults(null);
                  const shuffled = shuffle(ex.items);
                  if (shuffled.every((s, i) => s === ex.items[i]) && shuffled.length > 1) {
                    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
                  }
                  setItems(shuffled);
                }}
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
          )}
        </div>
      )}
    </div>
  );
}
