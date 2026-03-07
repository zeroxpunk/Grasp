import { getServerClient } from "@/lib/api";
import { renderMarkdown, renderCodeBlock } from "@/lib/render-markdown";
import { toExercise } from "@/lib/types";
import { LessonView } from "./lesson-view";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; lesson: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { slug, lesson: lessonStr } = await params;
  const lessonNumber = parseInt(lessonStr, 10);
  const client = await getServerClient();

  const manifest = await client.courses.get(slug);
  const lessonEntry = manifest.lessons.find((l) => l.number === lessonNumber);

  if (!lessonEntry) {
    return (
      <div className="mx-auto max-w-7xl px-6 mt-14 pb-16">
        <p className="text-zinc-500">Lesson not found.</p>
      </div>
    );
  }

  if (lessonEntry.status === "not_created") {
    return (
      <div className="mx-auto max-w-7xl px-6 mt-14 pb-16">
        <div className="max-w-3xl mx-auto py-16">
          <p className="text-zinc-500">
            This lesson will be unlocked when you complete the previous one.
          </p>
          <p className="text-zinc-600 mt-2 text-sm">
            Lesson content is generated adaptively based on your progress.
          </p>
        </div>
      </div>
    );
  }

  const detail = await client.lessons.get(slug, lessonNumber);

  const lessonContent = detail.content;
  const exercises = detail.exercises.map(toExercise);
  const exerciseProgress: Record<number, { status: "attempted" | "completed"; attemptedAt: string }> = {};
  for (const [id, entry] of Object.entries(detail.exerciseProgress)) {
    exerciseProgress[Number(id)] = entry;
  }

  const lessonHtml = lessonContent
    ? await renderMarkdown(lessonContent)
    : null;

  // Pre-render Shiki-highlighted code for exercises with code snippets
  const skipShikiTypes = new Set(["code-completion", "bug-hunt"]);
  const exerciseCodeHtml: Record<number, string> = {};
  for (const ex of exercises) {
    if (!skipShikiTypes.has(ex.type) && "code" in ex && ex.code && "language" in ex && ex.language) {
      exerciseCodeHtml[ex.id] = await renderCodeBlock(ex.code, ex.language);
    }
  }

  return (
    <LessonView
      courseSlug={slug}
      lessonContent={lessonContent}
      lessonHtml={lessonHtml}
      lessonTitle={detail.title}
      lessonNumber={lessonNumber}
      courseTitle={manifest.title}
      isCompleted={detail.status === "completed"}
      prevLesson={
        detail.previousLesson
          ? { number: detail.previousLesson.number, title: detail.previousLesson.title }
          : null
      }
      nextLesson={
        detail.nextLesson
          ? { number: detail.nextLesson.number, title: detail.nextLesson.title }
          : null
      }
      exercises={exercises}
      exerciseCodeHtml={exerciseCodeHtml}
      exerciseProgress={exerciseProgress}
      hasChatHistory={(await client.chat.getHistory(slug, lessonNumber)).length > 0}
    />
  );
}
