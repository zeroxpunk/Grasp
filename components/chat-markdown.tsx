"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DiagramImage } from "@/components/diagram-image";

const DIAGRAM_REGEX = /\[DIAGRAM:\s*(.+?)\]/g;

/**
 * Splits content into text segments and diagram markers.
 * Each diagram marker becomes a DiagramImage component.
 */
function renderWithDiagrams(content: string) {
  const parts: Array<{ type: "text"; value: string } | { type: "diagram"; description: string }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(DIAGRAM_REGEX)) {
    const before = content.slice(lastIndex, match.index);
    if (before) parts.push({ type: "text", value: before });
    parts.push({ type: "diagram", description: match[1].trim() });
    lastIndex = match.index! + match[0].length;
  }

  const after = content.slice(lastIndex);
  if (after) parts.push({ type: "text", value: after });

  return parts;
}

export function ChatMarkdown({ content }: { content: string }) {
  const parts = renderWithDiagrams(content);

  if (parts.length === 1 && parts[0].type === "text") {
    return <MarkdownBlock content={content} />;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === "diagram" ? (
          <DiagramImage key={i} description={part.description} />
        ) : (
          <MarkdownBlock key={i} content={part.value} />
        )
      )}
    </>
  );
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="text-zinc-200 font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code
                className="block bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-[12px] leading-relaxed overflow-x-auto whitespace-pre"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <code className="bg-zinc-800/60 text-zinc-300 px-1 py-0.5 rounded text-[12px]" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <div className="my-2">{children}</div>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => (
          <p className="text-zinc-200 font-semibold mb-1">{children}</p>
        ),
        h2: ({ children }) => (
          <p className="text-zinc-200 font-semibold mb-1">{children}</p>
        ),
        h3: ({ children }) => (
          <p className="text-zinc-200 font-semibold mb-1">{children}</p>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-zinc-700 pl-3 text-zinc-500 my-2">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 underline hover:text-zinc-200"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <table className="w-full my-2 text-[13px] border-collapse">{children}</table>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-zinc-700">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left text-zinc-300 font-medium py-1 pr-4">{children}</th>
        ),
        td: ({ children }) => (
          <td className="py-1 pr-4 text-zinc-400">{children}</td>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-zinc-800">{children}</tr>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

