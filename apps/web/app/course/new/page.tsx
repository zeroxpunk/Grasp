"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGraspClient } from "@/lib/grasp-client-provider";
import type { JobStatus } from "@/lib/types";

type Step = "idle" | "researching" | "generating" | "writing" | "done" | "error";

const STEP_MESSAGES: Record<string, string[]> = {
  researching: [
    "Searching for learning materials",
    "Finding documentation and guides",
    "Looking for video tutorials",
    "Exploring GitHub repositories",
    "Checking community resources",
    "Gathering reference materials",
  ],
  generating: [
    "Designing course structure",
    "Analyzing learning objectives",
    "Planning lessons and concepts",
    "Mapping concept dependencies",
    "Sequencing topics for progression",
    "Crafting exercises and challenges",
    "Building knowledge checkpoints",
    "Tailoring to your background",
    "Incorporating researched materials",
    "Finalizing lesson content",
  ],
};

function jobStatusToStep(status: JobStatus): Step {
  switch (status) {
    case "pending":
      return "researching";
    case "running":
      return "generating";
    case "completed":
      return "done";
    case "failed":
      return "error";
    default:
      return "generating";
  }
}

export default function NewCoursePage() {
  const client = useGraspClient();
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const loading = step !== "idle" && step !== "error";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const messages = STEP_MESSAGES[step];
    if (messages) {
      setMsgIndex(0);
      setMsgVisible(true);
      msgTimerRef.current = setInterval(() => {
        setMsgVisible(false);
        setTimeout(() => {
          setMsgIndex((prev) => (prev + 1) % messages.length);
          setMsgVisible(true);
        }, 300);
      }, 4000);
      return () => {
        if (msgTimerRef.current) clearInterval(msgTimerRef.current);
      };
    }
    if (msgTimerRef.current) clearInterval(msgTimerRef.current);
  }, [step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || loading) return;

    setStep("researching");
    setError(null);
    setElapsed(0);
    setCourseTitle(null);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    try {
      const { jobId } = await client.courses.create({
        description: description.trim(),
        context: context.trim() || undefined,
      });

      // Poll for job completion
      while (true) {
        const job = await client.jobs.get(jobId);
        setStep(jobStatusToStep(job.status));

        if (job.status === "failed") {
          setError(job.error || "Course creation failed");
          if (timerRef.current) clearInterval(timerRef.current);
          return;
        }

        if (job.status === "completed") {
          const slug = (job.result as Record<string, unknown>)?.courseSlug as string;
          if (slug) {
            // Fetch course title for display
            try {
              const manifest = await client.courses.get(slug);
              setCourseTitle(manifest.title);
            } catch {}

            if (timerRef.current) clearInterval(timerRef.current);
            setTimeout(() => {
              router.push(`/course/${slug}`);
            }, 1500);
          }
          return;
        }

        await new Promise((r) => setTimeout(r, 2500));
      }
    } catch {
      setStep("error");
      setError("Connection failed. Is the backend running?");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8 sm:mt-14 pb-16">
      <div className="max-w-2xl mx-auto">
        {step === "idle" || step === "error" ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
              New course
            </h1>
            <p className="mt-3 text-zinc-600 text-sm">
              Describe what you want to learn. A structured course will be
              generated with adaptive lessons, exercises, and external resources.
            </p>

            <form onSubmit={handleSubmit} className="mt-14 space-y-10">
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm text-zinc-400 mb-3"
                >
                  What do you want to learn?
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Learn Rust from scratch, focusing on systems programming. I know Kotlin well and want to build a CLI tool."
                  rows={4}
                  className="w-full bg-transparent border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="context"
                  className="block text-sm text-zinc-400 mb-3"
                >
                  Context
                  <span className="text-zinc-700 ml-2">optional</span>
                </label>
                <textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Focus on memory safety and concurrency. Include a capstone project."
                  rows={3}
                  className="w-full bg-transparent border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="border border-red-900/50 px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!description.trim()}
                className="border border-zinc-700 px-6 py-3 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              >
                Generate course
              </button>
            </form>
          </>
        ) : (
          <div className="mt-32 flex flex-col items-center">
            {step === "done" ? (
              <DoneView title={courseTitle} />
            ) : (
              <GeneratingView
                step={step}
                elapsed={elapsed}
                formatTime={formatTime}
                generatingMessage={(STEP_MESSAGES[step] || [])[msgIndex] || ""}
                messageVisible={msgVisible}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MorphingShape() {
  return (
    <div className="relative w-12 h-12 mb-10">
      <div
        className="absolute inset-0 bg-zinc-500/15"
        style={{
          animation: "morph-pulse 3s ease-in-out infinite, morph-shadow 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-1 bg-zinc-400/10 border border-zinc-700/50"
        style={{
          animation: "morph 6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-2.5 bg-zinc-300/10"
        style={{
          animation: "morph-shadow 4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function GeneratingView({
  step,
  elapsed,
  formatTime,
  generatingMessage,
  messageVisible,
}: {
  step: Step;
  elapsed: number;
  formatTime: (s: number) => string;
  generatingMessage: string;
  messageVisible: boolean;
}) {
  const stageLabel =
    step === "researching"
      ? "Researching"
      : step === "generating"
        ? "Generating course"
        : step === "writing"
          ? "Writing files"
          : "";

  return (
    <>
      <MorphingShape />

      <p className="text-sm text-zinc-300 font-medium">{stageLabel}</p>

      {generatingMessage && (
        <p
          className="mt-3 text-sm text-zinc-600 transition-opacity duration-300"
          style={{ opacity: messageVisible ? 1 : 0 }}
        >
          {generatingMessage}
        </p>
      )}

      <p className="mt-8 text-xs text-zinc-700 tabular-nums">
        {formatTime(elapsed)}
      </p>
    </>
  );
}

function DoneView({ title }: { title: string | null }) {
  return (
    <>
      <div className="w-10 h-10 mb-8 rounded-full border border-zinc-700 flex items-center justify-center">
        <svg
          className="w-4 h-4 text-zinc-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <p className="text-sm text-zinc-300 font-medium">Course created</p>
      {title && <p className="mt-2 text-sm text-zinc-600">{title}</p>}
      <p className="mt-6 text-xs text-zinc-700">Redirecting...</p>
    </>
  );
}
