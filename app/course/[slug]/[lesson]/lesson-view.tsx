"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatPanel, Message } from "@/components/chat-panel";
import { TextSelectionPopover } from "@/components/text-selection-popover";
import { ExerciseRenderer } from "@/components/exercises/exercise-renderer";
import { ImageLightbox } from "@/components/image-lightbox";
import { TableOfContents } from "@/components/table-of-contents";
import type { Exercise, ExerciseProgress } from "@/lib/types";

interface LessonViewProps {
  courseSlug: string;
  lessonContent: string | null;
  lessonHtml: string | null;
  lessonTitle: string;
  lessonNumber: number;
  courseTitle: string;
  isCompleted: boolean;
  prevLesson: { number: number; title: string } | null;
  nextLesson: { number: number; title: string } | null;
  exercises: Exercise[];
  exerciseCodeHtml: Record<number, string>;
  exerciseProgress: Record<number, ExerciseProgress>;
  hasChatHistory: boolean;
}

export function LessonView({
  courseSlug,
  lessonContent,
  lessonHtml,
  lessonTitle,
  lessonNumber,
  courseTitle,
  isCompleted,
  prevLesson,
  nextLesson,
  exercises,
  exerciseCodeHtml,
  exerciseProgress,
  hasChatHistory,
}: LessonViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{ images: { src: string; alt: string }[]; index: number } | null>(null);
  const [chatOpen, setChatOpen] = useState(hasChatHistory);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatWidth, setChatWidth] = useState(460);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [initialExerciseId, setInitialExerciseId] = useState<number | null>(null);
  const [completed, setCompleted] = useState(isCompleted);
  const [evaluating, setEvaluating] = useState(false);
  const [preparingNext, setPreparingNext] = useState(false);
  const [liveExercises, setLiveExercises] = useState<Exercise[]>(exercises);
  const [liveProgress, setLiveProgress] = useState<Record<number, ExerciseProgress>>(exerciseProgress);

  useEffect(() => {
    setLiveProgress((prev) => ({ ...prev, ...exerciseProgress }));
  }, [exerciseProgress]);

  const allExercisesDone = liveExercises.length > 0 &&
    liveExercises.every((ex) => liveProgress[ex.id]);

  // Persist and restore scroll position
  const scrollKey = `scroll:${courseSlug}/${lessonNumber}`;

  useEffect(() => {
    const saved = sessionStorage.getItem(scrollKey);
    if (!saved) return;
    const y = parseInt(saved, 10);
    if (chatOpen) {
      scrollRef.current?.scrollTo(0, y);
    } else {
      window.scrollTo(0, y);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = chatOpen
          ? scrollRef.current?.scrollTop ?? 0
          : window.scrollY;
        sessionStorage.setItem(scrollKey, String(Math.round(y)));
        ticking = false;
      });
    };

    const target = chatOpen ? scrollRef.current : window;
    if (!target) return;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [chatOpen, scrollKey]);

  // Image loading indicators — show skeleton while images load (esp. on-demand generation)
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const figures = container.querySelectorAll<HTMLElement>(".md-figure");
    figures.forEach((figure) => {
      const img = figure.querySelector<HTMLImageElement>("img.md-img");
      if (!img) return;
      if (img.complete && img.naturalWidth > 0) return; // already loaded

      figure.classList.add("img-loading");
      img.addEventListener("load", () => figure.classList.remove("img-loading"), { once: true });
      img.addEventListener("error", () => {
        figure.classList.remove("img-loading");
        figure.classList.add("img-error");
      }, { once: true });
    });
  }, [lessonHtml, chatOpen]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handler = (e: MouseEvent) => {
      const img = (e.target as HTMLElement).closest("img.md-img") as HTMLImageElement | null;
      if (!img) return;
      const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img.md-img"));
      const idx = imgs.indexOf(img);
      if (idx === -1) return;
      setLightbox({
        images: imgs.map((i) => ({ src: i.src, alt: i.alt || "" })),
        index: idx,
      });
    };
    container.addEventListener("click", handler);
    return () => container.removeEventListener("click", handler);
  }, [lessonHtml, chatOpen]);

  const isDragging = useRef(false);
  const router = useRouter();

  const handleAskAbout = useCallback(
    (text: string) => {
      const question = `Explain this from the lesson:\n\n"${text}"`;
      if (!chatOpen) {
        setInitialMessage(question);
        setChatOpen(true);
        startSession();
      } else {
        const inject = (window as unknown as Record<string, unknown>)
          .__chatPanelInject;
        if (typeof inject === "function") {
          (inject as (t: string) => void)(question);
        }
      }
    },
    [chatOpen] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleExerciseAttempted = useCallback((exerciseId: number, status?: "attempted" | "completed") => {
    setLiveProgress((prev) => {
      const s = status || "attempted";
      if (prev[exerciseId]?.status === "completed" && s === "attempted") return prev;
      return { ...prev, [exerciseId]: { status: s, attemptedAt: new Date().toISOString() } };
    });
  }, []);

  const handleSelfGrade = useCallback((exerciseId: number, completed: boolean) => {
    const status = completed ? "completed" : "attempted";
    handleExerciseAttempted(exerciseId, status);
    // Persist to server
    fetch("/api/exercise-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseSlug, lessonNumber, exerciseId, completed }),
    }).catch(() => {});
  }, [courseSlug, lessonNumber, handleExerciseAttempted]);

  const handleAnswerInChat = useCallback(
    (exercise: Exercise) => {
      if (!chatOpen) {
        setInitialExerciseId(exercise.id);
        setChatOpen(true);
        startSession();
      } else {
        if (chatCollapsed) setChatCollapsed(false);
        const inject = (window as unknown as Record<string, unknown>)
          .__chatPanelInjectExercise;
        if (typeof inject === "function") {
          (inject as (id: number) => void)(exercise.id);
        }
      }
    },
    [chatOpen, chatCollapsed] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startSession = async () => {
    setChatOpen(true);
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", courseSlug }),
      });
        await fetch(`/api/courses/${courseSlug}`, { method: "GET" });
    } catch {}
  };

  const buildExerciseSummary = useCallback(() => {
    const lines = liveExercises
      .filter((ex) => liveProgress[ex.id])
      .map((ex) => `- Exercise ${ex.id} (${ex.type}): "${ex.title}" — ${liveProgress[ex.id].status}`);
    return lines.length > 0
      ? `\n\n[Exercise progress from interactive UI]\n${lines.join("\n")}`
      : "";
  }, [liveExercises, liveProgress]);

  const handleSessionEnd = async (messages: Message[]) => {
    setEvaluating(true);
    const chatSummary = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");
    const summary = chatSummary + buildExerciseSummary();

    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });

      const evalRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: summary,
          lessonNumber,
          courseSlug,
        }),
      });
      const evalData = await evalRes.json();

      if (evalData.evaluation?.lessonComplete) {
        setCompleted(true);

        if (nextLesson) {
          setEvaluating(false);
          setPreparingNext(true);
          await waitForLesson(courseSlug, nextLesson.number);
          router.push(`/course/${courseSlug}/${nextLesson.number}`);
          return;
        }
      }
    } catch (e) {
      console.error("Evaluation failed:", e);
    } finally {
      setEvaluating(false);
      router.refresh();
    }
  };

  const handleDirectComplete = async () => {
    setEvaluating(true);
    const exerciseLines = liveExercises.map((ex) => {
      const progress = liveProgress[ex.id];
      const status = progress?.status || "not attempted";
      return `- Exercise ${ex.id} (${ex.type}): "${ex.title}" — ${status}`;
    });
    const summary = `The learner studied the lesson content and completed all exercises via the interactive UI:\n${exerciseLines.join("\n")}`;

    try {
      // End any active session (best-effort)
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      }).catch(() => {});

      const evalRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: summary,
          lessonNumber,
          courseSlug,
        }),
      });
      const evalData = await evalRes.json();

      if (evalData.evaluation?.lessonComplete) {
        setCompleted(true);
        if (nextLesson) {
          setEvaluating(false);
          setPreparingNext(true);
          await waitForLesson(courseSlug, nextLesson.number);
          router.push(`/course/${courseSlug}/${nextLesson.number}`);
          return;
        }
      }
    } catch (e) {
      console.error("Direct evaluation failed:", e);
    } finally {
      setEvaluating(false);
      router.refresh();
    }
  };

  async function waitForLesson(slug: string, lesson: number) {
    for (let i = 0; i < 60; i++) {
      const res = await fetch(`/api/courses/${slug}`);
      if (res.ok) {
        const manifest = await res.json();
        const entry = manifest.lessons?.find((l: { number: number; status: string }) => l.number === lesson);
        if (entry && entry.status !== "not_created") return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  useEffect(() => {
    if (chatOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [chatOpen]);

  useEffect(() => {
    const handler = (question: string) => {
      if (!chatOpen) {
        setInitialMessage(question);
        setChatOpen(true);
        startSession();
      } else {
        if (chatCollapsed) setChatCollapsed(false);
        const send = (window as unknown as Record<string, unknown>).__chatPanelSendMessage;
        if (typeof send === "function") {
          (send as (t: string) => void)(question);
        }
      }
    };
    (window as unknown as Record<string, unknown>).__chatPanelExplainCode = handler;
    return () => {
      delete (window as unknown as Record<string, unknown>).__chatPanelExplainCode;
    };
  }, [chatOpen, chatCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (chatOpen) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 z-30 flex">
        <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 pb-24 xl:max-w-none xl:grid xl:grid-cols-[10rem_minmax(0,48rem)] xl:justify-center xl:gap-8">
            <aside className="hidden xl:block">
              <div className="sticky top-8">
                {lessonContent && (
                  <TableOfContents contentRef={contentRef} scrollContainerRef={scrollRef} />
                )}
              </div>
            </aside>
            <div className="min-w-0">
              <LessonHeader
                courseSlug={courseSlug}
                courseTitle={courseTitle}
                lessonTitle={lessonTitle}
                completed={completed}
                prevLesson={prevLesson}
                nextLesson={nextLesson}
              />

              {!lessonContent ? (
                <EmptyContent />
              ) : (
                <div ref={contentRef} className="relative">
                  <TextSelectionPopover
                    containerRef={contentRef as React.RefObject<HTMLDivElement>}
                    onAskAbout={handleAskAbout}
                  />
                  <article
                    dangerouslySetInnerHTML={{ __html: lessonHtml! }}
                  />
                </div>
              )}

              {liveExercises.length > 0 ? (
                <ExercisesSection
                  exercises={liveExercises}
                  exerciseCodeHtml={exerciseCodeHtml}
                  exerciseProgress={liveProgress}
                  onSelfGrade={handleSelfGrade}
                  onAnswerInChat={handleAnswerInChat}
                />
              ) : lessonContent ? (
                <MissingExercises courseSlug={courseSlug} lessonNumber={lessonNumber} onGenerated={setLiveExercises} />
              ) : null}
            </div>
          </div>
        </div>

        {lightbox && (
          <ImageLightbox
            images={lightbox.images}
            index={lightbox.index}
            onClose={() => setLightbox(null)}
            onChange={(i) => setLightbox((prev) => prev ? { ...prev, index: i } : null)}
          />
        )}

        {chatCollapsed ? (
          <div
            className="w-11 shrink-0 border-l border-zinc-800 flex flex-col items-center pt-3 gap-2 bg-[var(--surface)]"
            style={{ animation: "panel-in 200ms ease-out" }}
          >
            <button
              onClick={() => setChatCollapsed(false)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors p-1"
              title="Expand chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-[11px] text-zinc-600 select-none [writing-mode:vertical-lr]">
              Chat
            </span>
          </div>
        ) : null}

        <div
          className={`shrink-0 border-l border-zinc-800 relative ${chatCollapsed ? "hidden" : ""}`}
          style={{ width: chatWidth, animation: "panel-in 200ms ease-out" }}
        >
          {/* Drag handle */}
          <div
            className="absolute inset-y-0 left-0 w-1 cursor-col-resize z-10 hover:bg-zinc-700/40 active:bg-zinc-700/60 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              isDragging.current = true;
              const startX = e.clientX;
              const startWidth = chatWidth;
              const onMouseMove = (ev: MouseEvent) => {
                if (!isDragging.current) return;
                const delta = startX - ev.clientX;
                const next = Math.min(Math.max(startWidth + delta, 360), 900);
                setChatWidth(next);
              };
              const onMouseUp = () => {
                isDragging.current = false;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
              };
              document.addEventListener("mousemove", onMouseMove);
              document.addEventListener("mouseup", onMouseUp);
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
          />
          <ChatPanel
            lessonContent={lessonContent || ""}
            lessonTitle={lessonTitle}
            courseSlug={courseSlug}
            lessonNumber={lessonNumber}
            initialMessage={initialMessage}
            initialExerciseId={initialExerciseId}
            onSessionEnd={handleSessionEnd}
            evaluating={evaluating}
            preparingNext={preparingNext}
            exercises={liveExercises}
            onCollapse={() => setChatCollapsed(true)}
            exerciseProgress={liveProgress}
            onExerciseAttempted={handleExerciseAttempted}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 mt-14 pb-16">
      <div className="max-w-3xl mx-auto xl:max-w-none xl:grid xl:grid-cols-[11rem_minmax(0,48rem)] xl:justify-center xl:gap-10">
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            {lessonContent && (
              <TableOfContents contentRef={contentRef} />
            )}
          </div>
        </aside>
        <div className="min-w-0">
          <LessonHeader
            courseSlug={courseSlug}
            courseTitle={courseTitle}
            lessonTitle={lessonTitle}
            completed={completed}
            prevLesson={prevLesson}
            nextLesson={nextLesson}
          />

          {!completed && (evaluating || preparingNext) && (
            <div className="mb-12">
              <span className="text-sm text-zinc-500 animate-pulse">
                {preparingNext ? "Preparing next lesson..." : "Evaluating..."}
              </span>
            </div>
          )}

          {!completed && !evaluating && !preparingNext && (
            <div className="flex items-center gap-3 mb-12">
              {allExercisesDone && (
                <button
                  onClick={handleDirectComplete}
                  className="border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
                >
                  Complete lesson
                </button>
              )}
              <button
                onClick={startSession}
                className="border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
              >
                {allExercisesDone ? "Open chat" : "Start lesson"}
              </button>
            </div>
          )}

          {completed && nextLesson && (
            <Link
              href={`/course/${courseSlug}/${nextLesson.number}`}
              className="mb-12 inline-block border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
            >
              Next lesson &rarr;
            </Link>
          )}

          {!lessonContent ? (
            <EmptyContent onStart={startSession} />
          ) : (
            <div ref={contentRef} className="relative">
              <TextSelectionPopover
                containerRef={contentRef as React.RefObject<HTMLDivElement>}
                onAskAbout={handleAskAbout}
              />
              <article
                dangerouslySetInnerHTML={{ __html: lessonHtml! }}
              />
            </div>
          )}

          {exercises.length > 0 && (
            <ExercisesSection
              exercises={liveExercises}
              exerciseCodeHtml={exerciseCodeHtml}
              exerciseProgress={exerciseProgress}
              onSelfGrade={handleSelfGrade}
              onAnswerInChat={handleAnswerInChat}
            />
          )}
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(i) => setLightbox((prev) => prev ? { ...prev, index: i } : null)}
        />
      )}
    </div>
  );
}

function LessonHeader({
  courseSlug,
  courseTitle,
  lessonTitle,
  completed,
  prevLesson,
  nextLesson,
}: {
  courseSlug: string;
  courseTitle: string;
  lessonTitle: string;
  completed: boolean;
  prevLesson: { number: number; title: string } | null;
  nextLesson: { number: number; title: string } | null;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/course/${courseSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {courseTitle}
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {prevLesson && (
            <Link
              href={`/course/${courseSlug}/${prevLesson.number}`}
              className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </Link>
          )}
          {nextLesson && (
            <Link
              href={`/course/${courseSlug}/${nextLesson.number}`}
              className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          {lessonTitle}
        </h1>
        {completed && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Completed
          </span>
        )}
      </div>
    </div>
  );
}

function ExercisesSection({
  exercises,
  exerciseCodeHtml,
  exerciseProgress,
  onSelfGrade,
  onAnswerInChat,
}: {
  exercises: Exercise[];
  exerciseCodeHtml: Record<number, string>;
  exerciseProgress: Record<number, ExerciseProgress>;
  onSelfGrade: (exerciseId: number, completed: boolean) => void;
  onAnswerInChat: (exercise: Exercise) => void;
}) {
  return (
    <section className="mt-14 mb-8">
      <h2 className="text-lg font-semibold text-zinc-200 mb-6">Exercises</h2>
      <div className="space-y-4">
        {exercises.map((ex) => (
          <ExerciseRenderer
            key={ex.id}
            exercise={ex}
            codeHtml={exerciseCodeHtml[ex.id]}
            progress={exerciseProgress[ex.id]}
            onSelfGrade={onSelfGrade}
            onAnswerInChat={onAnswerInChat}
          />
        ))}
      </div>
    </section>
  );
}

function MissingExercises({
  courseSlug,
  lessonNumber,
  onGenerated,
}: {
  courseSlug: string;
  lessonNumber: number;
  onGenerated: (exercises: Exercise[]) => void;
}) {
  const [status, setStatus] = useState<"generating" | "error" | "done">("generating");
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    async function generate() {
      try {
        const res = await fetch("/api/regenerate-exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseSlug, lessonNumber }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setError(data.error || "Failed to generate exercises");
          return;
        }
        setStatus("done");
        // Reload exercises from the server
        const exRes = await fetch(`/api/courses/${courseSlug}`);
        if (exRes.ok) {
          // Trigger a page refresh to pick up new exercises
          window.location.reload();
        }
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    generate();
  }, [courseSlug, lessonNumber, onGenerated]);

  function handleRetry() {
    setStatus("generating");
    setError(null);
    attempted.current = false;
    // Re-trigger by forcing effect — but since we use ref, we need a different approach
    (async () => {
      try {
        const res = await fetch("/api/regenerate-exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseSlug, lessonNumber }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setError(data.error || "Failed to generate exercises");
          return;
        }
        setStatus("done");
        window.location.reload();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    })();
  }

  return (
    <section className="mt-14 mb-8">
      <h2 className="text-lg font-semibold text-zinc-200 mb-6">Exercises</h2>
      {status === "generating" && (
        <div className="border border-zinc-800 rounded-lg p-6 text-center">
          <span className="text-[13px] text-zinc-500 animate-pulse">
            Generating exercises...
          </span>
        </div>
      )}
      {status === "error" && (
        <div className="border border-red-900/40 rounded-lg p-6 text-center space-y-3">
          <p className="text-[13px] text-red-400/80">
            Exercise generation failed{error ? `: ${error}` : ""}
          </p>
          <button
            onClick={handleRetry}
            className="text-[12px] text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}

function EmptyContent({ onStart }: { onStart?: () => void }) {
  return (
    <div className="py-16">
      <p className="text-zinc-500">
        This lesson doesn&apos;t have pre-written content.
      </p>
      <p className="text-zinc-600 mt-2 text-sm">
        Start a session — the AI tutor will generate a personalized lesson
        based on your progress.
      </p>
      {onStart && (
        <button
          onClick={onStart}
          className="mt-6 border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
        >
          Start lesson
        </button>
      )}
    </div>
  );
}
