"use client";

import { memo, startTransition, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { useGraspClient } from "@/lib/grasp-client-provider";
import type { Exercise, ExerciseProgress } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  exerciseId?: number;
}

interface ChatPanelProps {
  lessonTitle: string;
  courseSlug: string;
  lessonNumber: number;
  initialMessage?: string | null;
  initialExerciseId?: number | null;
  onSessionEnd?: (messages: Message[]) => void;
  evaluating?: boolean;
  preparingNext?: boolean;
  exercises?: Exercise[];
  onCollapse?: () => void;
  exerciseProgress?: Record<number, ExerciseProgress>;
  onExerciseAttempted?: (exerciseId: number, status?: "attempted" | "completed") => void;
}

function ChatExerciseWidget({ exercise }: { exercise: Exercise }) {
  return (
    <div className="border border-zinc-700/60 rounded-lg p-3 bg-zinc-900/40">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-zinc-600 font-mono">#{exercise.id}</span>
        {exercise.type && (
          <span className="text-[10px] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded">{exercise.type}</span>
        )}
        <span className="text-[13px] font-medium text-zinc-200">{exercise.title}</span>
      </div>
      <div className="text-[12px] text-zinc-400 leading-relaxed [&_p]:mb-1 [&_p:last-child]:mb-0 [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px] [&_strong]:text-zinc-300 [&_strong]:font-medium [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
        <ChatMarkdown content={exercise.prompt} />
      </div>
      {"code" in exercise && exercise.code && (
        <pre className="mt-2 bg-zinc-950/60 p-2.5 rounded text-[11px] text-zinc-400 overflow-x-auto whitespace-pre">
          <code>{exercise.code as string}</code>
        </pre>
      )}
    </div>
  );
}

function ChatLoadingSkeleton() {
  const shimmerClass =
    "animate-[img-shimmer_1.8s_ease-in-out_infinite] bg-[linear-gradient(90deg,#171923_25%,#22243a_50%,#171923_75%)] bg-[length:200%_100%]";

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="max-w-[78%] rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4">
        <div className={`h-3 rounded-full ${shimmerClass}`} />
        <div className={`mt-2 h-3 w-[72%] rounded-full ${shimmerClass}`} />
        <div className={`mt-2 h-3 w-[46%] rounded-full ${shimmerClass}`} />
      </div>
      <div className="ml-auto max-w-[72%] rounded-2xl border border-zinc-800/70 bg-white/[0.03] p-4">
        <div className={`h-3 rounded-full ${shimmerClass}`} />
        <div className={`mt-2 h-3 w-[58%] rounded-full ${shimmerClass}`} />
      </div>
      <div className="max-w-[82%] rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4">
        <div className={`h-3 rounded-full ${shimmerClass}`} />
        <div className={`mt-2 h-3 w-[84%] rounded-full ${shimmerClass}`} />
        <div className={`mt-2 h-3 w-[51%] rounded-full ${shimmerClass}`} />
      </div>
    </div>
  );
}

const ChatTimeline = memo(function ChatTimeline({
  historyLoaded,
  messages,
  isStreaming,
  exercises,
  scrollContainerRef,
  messagesEndRef,
}: {
  historyLoaded: boolean;
  messages: Message[];
  isStreaming: boolean;
  exercises?: Exercise[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable] touch-pan-y"
    >
      {!historyLoaded ? (
        <ChatLoadingSkeleton />
      ) : messages.length === 0 ? (
        <div className="flex h-full items-center justify-center px-8">
          <div className="text-center">
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Ask a question about this lesson
            </p>
            <p className="mt-1.5 text-[11px] text-zinc-700">
              or select text and click &ldquo;Ask about this&rdquo;
            </p>
          </div>
        </div>
      ) : (
        <div className="px-2 py-3 sm:px-3">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`mb-2 rounded-2xl border border-zinc-900/60 ${
                message.role === "user"
                  ? "ml-auto max-w-[88%] bg-white/[0.04] sm:max-w-[82%]"
                  : "max-w-[92%] bg-zinc-950/70 sm:max-w-[86%]"
              }`}
            >
              <div className="px-4 pb-3 pt-3.5">
                <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  {message.role === "user" ? "You" : "Tutor"}
                </p>
                <div
                  className={`text-[13px] leading-[1.7] break-words ${
                    message.role === "user"
                      ? "text-zinc-200 whitespace-pre-wrap"
                      : "text-zinc-400"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <ChatMarkdown content={message.content} />
                  ) : message.exerciseId && exercises ? (
                    <ChatExerciseWidget
                      exercise={exercises.find((e) => e.id === message.exerciseId)!}
                    />
                  ) : (
                    message.content
                  )}
                  {message.role === "assistant" &&
                    isStreaming &&
                    i === messages.length - 1 && (
                      <span
                        className="ml-0.5 inline-block h-[14px] w-[5px] align-text-bottom bg-zinc-500"
                        style={{
                          animation: "cursor-blink 1s step-end infinite",
                        }}
                      />
                    )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
});

export function ChatPanel({
  lessonTitle,
  courseSlug,
  lessonNumber,
  initialMessage,
  initialExerciseId,
  onSessionEnd,
  evaluating = false,
  preparingNext = false,
  exercises,
  onCollapse,
  exerciseProgress,
  onExerciseAttempted,
}: ChatPanelProps) {
  const client = useGraspClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    async function load() {
      try {
        const saved = await client.chat.getHistory(courseSlug, lessonNumber);
        if (saved.length > 0) {
          startTransition(() => {
            setMessages(saved.map((m) => ({
              role: m.role,
              content: m.content,
              exerciseId: m.exerciseId ?? undefined,
            })));
          });
        }
      } catch {
      } finally {
        setHistoryLoaded(true);
      }
    }
    load();
  }, [client, courseSlug, lessonNumber]);

  useEffect(() => {
    if (!historyLoaded) return;
    if (initialMessage) {
      sendMessage(initialMessage);
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [historyLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateStickiness = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 96;
    };

    updateStickiness();
    container.addEventListener("scroll", updateStickiness, { passive: true });
    return () => container.removeEventListener("scroll", updateStickiness);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom(isStreaming ? "auto" : "smooth");
  }, [messages, isStreaming, scrollToBottom]);

  const exchangeCount = messages.filter((m) => m.role === "user").length;

  const attemptedExerciseIds = useMemo(() => {
    const ids = new Set<number>();
    if (exerciseProgress) {
      for (const [id] of Object.entries(exerciseProgress)) {
        ids.add(Number(id));
      }
    }
    for (const m of messages) {
      if (m.exerciseId != null) ids.add(m.exerciseId);
    }
    return ids;
  }, [messages, exerciseProgress]);

  const totalExercises = exercises?.length ?? 0;
  const allExercisesAttempted = totalExercises === 0 || attemptedExerciseIds.size >= totalExercises;
  const canComplete = !isStreaming && !evaluating && !preparingNext && allExercisesAttempted && (exchangeCount >= 3 || totalExercises > 0);

  function persistChat(msgs: Message[]) {
    client.chat.saveHistory(courseSlug, lessonNumber, {
      messages: msgs.map((m) => ({
        role: m.role,
        content: m.content,
        exerciseId: m.exerciseId ?? null,
      })),
    }).catch(() => {});
  }

  async function sendMessage(text: string) {
    if (!text || isStreaming) return;

    stickToBottomRef.current = true;
    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const stream = await client.chat.stream({
        courseSlug,
        lessonNumber,
        messages: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
          exerciseId: m.exerciseId ?? null,
        })),
      });

      const reader = stream.getReader();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.exerciseStatus) {
                onExerciseAttempted?.(parsed.exerciseStatus.exerciseId, parsed.exerciseStatus.status);
                continue;
              }

              const token =
                parsed.choices?.[0]?.delta?.content ??
                parsed.token ??
                parsed.content ??
                "";
              if (token) {
                accumulated += token;
                startTransition(() => {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: accumulated,
                    };
                    return updated;
                  });
                });
              }
            } catch {
              if (data && data !== "[DONE]") {
                accumulated += data;
                startTransition(() => {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: accumulated,
                    };
                    return updated;
                  });
                });
              }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setMessages((prev) => {
        persistChat(prev);
        return prev;
      });
    }
  }

  function handleSend() {
    sendMessage(input.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function handleComplete() {
    onSessionEnd?.(messages);
  }

  function injectQuestion(text: string) {
    stickToBottomRef.current = true;
    setInput(text);
    inputRef.current?.focus();
  }

  function injectExerciseMessage(exerciseId: number) {
    const exercise = exercises?.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const typeLabel = exercise.type ? ` [${exercise.type}]` : "";
    const ex = exercise as unknown as Record<string, unknown>;
    const codeStr = ex.code ? `\n\n\`\`\`${ex.language || ""}\n${ex.code}\n\`\`\`` : "";
    const content = `I'd like to attempt Exercise #${exercise.id}${typeLabel}: ${exercise.title}\n\n${exercise.prompt}${codeStr}`;
    const userMessage: Message = { role: "user", content, exerciseId };
    stickToBottomRef.current = true;
    setMessages((prev) => {
      const updated = [...prev, userMessage];
      persistChat(updated);
      return updated;
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__chatPanelInject = injectQuestion;
    w.__chatPanelInjectExercise = injectExerciseMessage;
    w.__chatPanelSendMessage = sendMessage;
    return () => {
      delete w.__chatPanelInject;
      delete w.__chatPanelInjectExercise;
      delete w.__chatPanelSendMessage;
    };
  });

  useEffect(() => {
    if (initialExerciseId != null) {
      injectExerciseMessage(initialExerciseId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface)] max-md:bg-[linear-gradient(180deg,rgba(19,20,26,0.98),rgba(12,13,18,1))]">
      <div className="shrink-0 border-b border-zinc-800/60 bg-zinc-950/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[13px] text-zinc-200 select-none">Tutor chat</span>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              {lessonTitle}
            </p>
          </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-600 select-none">
            {evaluating
              ? "Evaluating..."
              : isStreaming
                ? "Responding..."
                : messages.length > 0
                  ? `${exchangeCount} exchange${exchangeCount !== 1 ? "s" : ""}`
                  : ""}
          </span>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5"
              title="Collapse chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
        </div>
      </div>

      <ChatTimeline
        historyLoaded={historyLoaded}
        messages={messages}
        isStreaming={isStreaming}
        exercises={exercises}
        scrollContainerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
      />

      <div className="shrink-0 border-t border-zinc-900/60 bg-zinc-950/85 px-3 pt-2 backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {canComplete && (
          <button
            onClick={handleComplete}
            className="w-full mb-2.5 py-2 text-[12px] text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
          >
            Complete lesson
          </button>
        )}

        {!allExercisesAttempted && exchangeCount >= 3 && !isStreaming && !evaluating && (
          <p className="mb-2.5 text-center text-[11px] text-zinc-600">
            {attemptedExerciseIds.size}/{totalExercises} exercises attempted — complete all to finish the lesson
          </p>
        )}

        {(evaluating || preparingNext) && (
          <div className="mb-2.5 py-2 text-center">
            <span className="text-[12px] text-zinc-600 animate-pulse">
              {preparingNext ? "Preparing next lesson..." : "Evaluating your session..."}
            </span>
          </div>
        )}

        <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 focus-within:border-zinc-700 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this lesson..."
            rows={1}
            disabled={evaluating || preparingNext}
            onFocus={() => {
              stickToBottomRef.current = true;
              requestAnimationFrame(() => scrollToBottom("auto"));
            }}
            className="max-h-36 min-h-[22px] w-full resize-none overflow-y-auto bg-transparent px-3 pt-2.5 pb-0 text-[13px] leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-40"
          />
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <span className="text-[11px] text-zinc-700 select-none">
              ↵ Enter
            </span>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || evaluating}
              className="text-[11px] text-zinc-600 hover:text-zinc-300 disabled:text-zinc-800 disabled:hover:text-zinc-800 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Message, ChatPanelProps };
