"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import type { Exercise, ExerciseProgress } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  exerciseId?: number;
}

interface ChatPanelProps {
  lessonContent: string;
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

export function ChatPanel({
  lessonContent,
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/chat-history?slug=${courseSlug}&lesson=${lessonNumber}`);
        if (res.ok) {
          const saved: Message[] = await res.json();
          if (saved.length > 0) {
            setMessages(saved);
          }
        }
      } catch {
      } finally {
        setHistoryLoaded(true);
      }
    }
    load();
  }, [courseSlug, lessonNumber]);

  useEffect(() => {
    if (!historyLoaded) return;
    if (initialMessage) {
      sendMessage(initialMessage);
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [historyLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
    fetch("/api/chat-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseSlug, lessonNumber, messages: msgs }),
    }).catch(() => {});
  }

  async function sendMessage(text: string) {
    if (!text || isStreaming) return;

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          lessonContent,
          lessonTitle,
          courseSlug,
          lessonNumber,
          exercises,
          exerciseProgress,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

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
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: accumulated,
                  };
                  return updated;
                });
              }
            } catch {
              if (data && data !== "[DONE]") {
                accumulated += data;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: accumulated,
                  };
                  return updated;
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
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialExerciseId != null) {
      injectExerciseMessage(initialExerciseId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      <div className="shrink-0 flex items-center justify-between h-11 px-4 border-b border-zinc-800/60">
        <span className="text-[13px] text-zinc-400 select-none">Chat</span>
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

      <div className="flex-1 min-h-0 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-8">
              <p className="text-[13px] text-zinc-600 leading-relaxed">
                Ask a question about this lesson
              </p>
              <p className="text-[11px] text-zinc-700 mt-1.5">
                or select text and click &ldquo;Ask about this&rdquo;
              </p>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message, i) => (
              <div
                key={i}
                className={
                  message.role === "user"
                    ? "px-4 py-3.5 bg-white/[0.02]"
                    : "px-4 py-3.5"
                }
              >
                <p className="text-[11px] text-zinc-600 mb-1">
                  {message.role === "user" ? "You" : "Assistant"}
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
                        className="inline-block w-[5px] h-[14px] bg-zinc-500 ml-0.5 align-text-bottom"
                        style={{
                          animation: "cursor-blink 1s step-end infinite",
                        }}
                      />
                    )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pb-3 pt-2">
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
            disabled={evaluating}
            className="w-full resize-none bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none px-3 pt-2.5 pb-0 leading-relaxed disabled:opacity-40"
            style={{ minHeight: "22px" }}
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
