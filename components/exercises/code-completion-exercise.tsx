"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { CodeCompletionExercise } from "@/lib/types";
import type { ExerciseComponentProps } from "./exercise-renderer";

const BLANK_MARKER = "___BLANK___";

export function CodeCompletionExerciseComponent({ exercise, progress, onSelfGrade, onAnswerInChat }: ExerciseComponentProps) {
  const ex = exercise as CodeCompletionExercise;
  const parts = useMemo(() => ex.codeTemplate.split(BLANK_MARKER), [ex.codeTemplate]);
  const blankCount = parts.length - 1;
  const [answers, setAnswers] = useState<string[]>(() => Array(blankCount).fill(""));
  const [submitted, setSubmitted] = useState(progress?.status === "completed" || progress?.status === "attempted");
  const [results, setResults] = useState<boolean[] | null>(null);

  function updateAnswer(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit() {
    const res = answers.map((a, i) => a.trim() === ex.blanks[i].trim());
    setResults(res);
    setSubmitted(true);
    onSelfGrade(ex.id, res.every(Boolean));
  }

  let blankIndex = 0;
  const allCorrect = results?.every(Boolean) ?? false;

  return (
    <div>
      <div className="text-[13px] text-zinc-400 leading-relaxed mb-4 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]">
        <ReactMarkdown>{ex.prompt}</ReactMarkdown>
      </div>

      <pre className="bg-zinc-900/60 p-4 rounded text-[13px] text-zinc-400 overflow-x-auto whitespace-pre font-mono leading-relaxed">
        {parts.map((part, i) => {
          if (i === parts.length - 1) {
            return <span key={i}>{part}</span>;
          }
          const bi = blankIndex++;
          const isCorrect = results?.[bi];
          let borderColor = "border-zinc-600 focus:border-zinc-400";
          if (submitted && isCorrect !== undefined) {
            borderColor = isCorrect
              ? "border-emerald-700 bg-emerald-950/30 text-emerald-400"
              : "border-red-800 bg-red-950/30 text-red-400";
          }

          return (
            <span key={i}>
              {part}
              <input
                type="text"
                value={answers[bi]}
                onChange={(e) => updateAnswer(bi, e.target.value)}
                disabled={submitted}
                placeholder={`blank ${bi + 1}`}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className={`inline-block bg-zinc-800/60 border rounded px-2 py-0.5 text-[13px] font-mono text-zinc-200 outline-none transition-colors ${borderColor} disabled:cursor-default`}
                style={{ width: `${Math.max(ex.blanks[bi].length + 2, 8)}ch` }}
              />
            </span>
          );
        })}
      </pre>

      {submitted && results && !allCorrect && (
        <div className="mt-3 space-y-1">
          {results.map((ok, i) => (
            !ok && (
              <p key={i} className="text-[12px] text-red-400/80">
                Blank {i + 1}: expected <code className="bg-zinc-800/60 px-1 py-0.5 rounded text-[11px] text-zinc-300">{ex.blanks[i]}</code>
              </p>
            )
          ))}
        </div>
      )}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={answers.some((a) => !a.trim())}
          className="mt-4 text-[12px] px-4 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Check answers
        </button>
      )}

      {submitted && results && (
        <div className="mt-2 space-y-1.5">
          <p className={`text-[12px] ${allCorrect ? "text-emerald-500/80" : "text-red-400/80"}`}>
            {allCorrect
              ? "All blanks correct."
              : `${results.filter(Boolean).length}/${results.length} correct.`}
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

