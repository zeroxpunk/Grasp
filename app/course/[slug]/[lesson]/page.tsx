import { getCourseManifest, getLessonContent, getAdjacentLessons, getLessonExercises, getLessonExerciseProgress, getLessonChat, writeLessonContent } from "@/lib/courses";
import { renderMarkdown, renderCodeBlock } from "@/lib/render-markdown";
import { processMarkdownVisuals, hasUnresolvedVisuals, ensureImageManifest } from "@/lib/image-gen";
import { LessonView } from "./lesson-view";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; lesson: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { slug, lesson: lessonStr } = await params;
  const lessonNumber = parseInt(lessonStr, 10);
  const manifest = await getCourseManifest(slug);
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

  const [data, adjacent, exercises, exerciseProgress, chatHistory] = await Promise.all([
    getLessonContent(slug, lessonNumber),
    getAdjacentLessons(manifest, lessonNumber),
    getLessonExercises(slug, lessonNumber),
    getLessonExerciseProgress(slug, lessonNumber),
    getLessonChat(slug, lessonNumber),
  ]);

  let lessonContent = data?.content || null;

  if (lessonContent && hasUnresolvedVisuals(lessonContent)) {
    lessonContent = await processMarkdownVisuals(lessonContent, slug);
    writeLessonContent(slug, lessonEntry, lessonContent).catch(() => {});
  }

  // Backfill manifest for old courses that have resolved image refs but no manifest
  if (lessonContent) {
    ensureImageManifest(lessonContent, slug).catch(() => {});
  }

  const lessonHtml = lessonContent
    ? await renderMarkdown(lessonContent)
    : null;

  // Pre-render Shiki-highlighted code for exercises with code snippets
  // Skip code-completion (uses plain <pre> with inline inputs) and bug-hunt (needs clickable lines)
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
      lessonTitle={lessonEntry.title}
      lessonNumber={lessonNumber}
      courseTitle={manifest.title}
      isCompleted={lessonEntry.status === "completed"}
      prevLesson={
        adjacent.prev
          ? { number: adjacent.prev.number, title: adjacent.prev.title }
          : null
      }
      nextLesson={
        adjacent.next
          ? { number: adjacent.next.number, title: adjacent.next.title }
          : null
      }
      exercises={exercises}
      exerciseCodeHtml={exerciseCodeHtml}
      exerciseProgress={exerciseProgress}
      hasChatHistory={chatHistory.length > 0}
    />
  );
}
