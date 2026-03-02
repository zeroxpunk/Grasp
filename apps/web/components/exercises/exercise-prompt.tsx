import ReactMarkdown from "react-markdown";

export function ExercisePrompt({ children }: { children: string }) {
  return (
    <div className="text-[13px] text-zinc-400 leading-relaxed mb-4 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px] [&_strong]:text-zinc-300 [&_strong]:font-medium [&_a]:text-zinc-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1.5">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
