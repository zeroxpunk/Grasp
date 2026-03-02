"use client";

import { useState } from "react";
import type { OutputPredictionExercise } from "@/lib/types";
import { ExercisePrompt } from "./exercise-prompt";
import type { ExerciseComponentProps } from "./exercise-renderer";

function normalizeOutput(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function OutputPredictionExerciseComponent({ exercise, codeHtml, progress, onSelfGrade, onAnswerInChat }: ExerciseComponentProps) {
  const ex = exercise as OutputPredictionExercise;
  const [prediction, setPrediction] = useState("");
  const [submitted, setSubmitted] = useState(progress?.status === "completed");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  function handleSubmit() {
    const correct = normalizeOutput(prediction) === normalizeOutput(ex.expectedOutput);
    setIsCorrect(correct);
    setSubmitted(true);
    onSelfGrade(ex.id, correct);
  }

  return (
    <div>
      <ExercisePrompt>{ex.prompt}</ExercisePrompt>

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

      <div className="mb-4">
        <label className="text-[11px] text-zinc-600 block mb-1.5">What does this output?</label>
        <input
          type="text"
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          disabled={submitted}
          placeholder="Type the expected output..."
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full bg-zinc-900/40 border border-zinc-800 rounded px-3 py-2 text-[13px] font-mono text-zinc-200 outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 disabled:opacity-50"
        />
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!prediction.trim()}
          className="text-[12px] px-4 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Check
        </button>
      )}

      {submitted && isCorrect && (
        <p className="text-[12px] text-emerald-500/80">Correct.</p>
      )}
      {submitted && isCorrect === false && (
        <div className="space-y-1.5">
          <p className="text-[12px] text-red-400/80">Not quite.</p>
          <div className="text-[12px] text-zinc-500">
            <span className="text-zinc-600">Expected: </span>
            <code className="bg-zinc-800/60 px-1.5 py-0.5 rounded text-[11px] text-zinc-300 font-mono">{ex.expectedOutput}</code>
          </div>
          <div className="text-[12px] text-zinc-500">
            <span className="text-zinc-600">Your answer: </span>
            <code className="bg-zinc-800/60 px-1.5 py-0.5 rounded text-[11px] text-red-400 font-mono">{prediction}</code>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSubmitted(false); setIsCorrect(null); setPrediction(""); }}
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
