"use client";

import ReactMarkdown from "react-markdown";
import type { TextExercise as TextExerciseType } from "@/lib/types";
import type { ExerciseComponentProps } from "./exercise-renderer";

export function TextExercise({ exercise, codeHtml, onAnswerInChat }: ExerciseComponentProps) {
  const ex = exercise as TextExerciseType;

  return (
    <div>
      <div className="text-[13px] text-zinc-400 leading-relaxed mb-4 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px] [&_strong]:text-zinc-300 [&_strong]:font-medium [&_a]:text-zinc-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1.5">
        <ReactMarkdown>{ex.prompt}</ReactMarkdown>
      </div>

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
