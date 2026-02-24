import { NextResponse } from "next/server";
import { buildLessonGenerationPrompt, buildExerciseGenerationPrompt } from "@/lib/agents";
import { generateMarkdown, generateExercisesJson, reviewContent } from "@/lib/ai";
import { normalizeExercises } from "@/lib/exercises";
import { processMarkdownVisuals } from "@/lib/image-gen";
import {
  getCourseManifest,
  writeCourseManifest,
  writeLessonContent,
  writeLessonExercises,
  getCourseMemory,
} from "@/lib/courses";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { courseSlug, lessonNumber } = await req.json();

    if (!courseSlug || !lessonNumber) {
      return NextResponse.json(
        { error: "courseSlug and lessonNumber are required" },
        { status: 400 }
      );
    }

    const manifest = await getCourseManifest(courseSlug);
    const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    console.log("[generate-lesson] generating lesson:", lessonNumber);

    const { systemPrompt, userPrompt } = await buildLessonGenerationPrompt(
      courseSlug,
      lessonNumber
    );

    const rawContent = await generateMarkdown({
      systemPrompt,
      prompt: userPrompt,
      webSearch: true,
    });

    const reviewedContent = await reviewContent({ content: rawContent, thinkingBudget: 10000 });
    const content = await processMarkdownVisuals(reviewedContent, courseSlug);

    await writeLessonContent(courseSlug, lesson, content);
    lesson.status = "not_started";
    await writeCourseManifest(manifest);

    try {
      const courseMemory = await getCourseMemory(courseSlug);
      const exercisePrompt = buildExerciseGenerationPrompt({
        lessonTitle: lesson.title,
        concepts: lesson.concepts,
        lessonContent: content,
        lessonNumber,
        totalLessons: manifest.lessons.length,
        mastery: manifest.mastery,
        courseTitle: manifest.title,
        courseDescription: manifest.description,
        courseMemory: courseMemory || undefined,
      });

      const raw = await generateExercisesJson({
        systemPrompt: exercisePrompt,
        prompt: `Generate exercises for Lesson ${lessonNumber}: "${lesson.title}". Concepts: ${lesson.concepts.join(", ")}.`,
      });
      const exercises = normalizeExercises(raw as Record<string, unknown>[]);
      await writeLessonExercises(courseSlug, lesson, exercises);
      console.log("[generate-lesson] exercises generated");
    } catch (err) {
      console.error("[generate-lesson] exercise generation failed (non-fatal):", err);
    }

    console.log("[generate-lesson] lesson", lessonNumber, "done");
    return NextResponse.json({ ok: true, lessonNumber });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-lesson] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
