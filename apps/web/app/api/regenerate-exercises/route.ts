import { NextResponse } from "next/server";
import { buildExerciseGenerationPrompt } from "@/lib/agents";
import { generateExercisesJson } from "@/lib/ai";
import { normalizeExercises } from "@/lib/exercises";
import {
  getCourseManifest,
  getLessonContent,
  getLessonExercises,
  writeLessonExercises,
  getCourseMemory,
} from "@/lib/courses";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { courseSlug, lessonNumber } = await req.json();

    if (!courseSlug || typeof courseSlug !== "string") {
      return NextResponse.json({ error: "courseSlug required" }, { status: 400 });
    }
    if (!lessonNumber || typeof lessonNumber !== "number") {
      return NextResponse.json({ error: "lessonNumber required" }, { status: 400 });
    }

    const manifest = await getCourseManifest(courseSlug);
    const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Check if exercises already exist
    const existing = await getLessonExercises(courseSlug, lessonNumber);
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, message: "Exercises already exist", count: existing.length });
    }

    const lessonData = await getLessonContent(courseSlug, lessonNumber);
    if (!lessonData) {
      return NextResponse.json({ error: "Lesson has no content yet" }, { status: 400 });
    }

    const courseMemory = await getCourseMemory(courseSlug);

    const exercisePrompt = buildExerciseGenerationPrompt({
      lessonTitle: lesson.title,
      concepts: lesson.concepts,
      lessonContent: lessonData.content,
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
    console.log("[regenerate-exercises] generated", exercises.length, "exercises for lesson", lessonNumber);

    return NextResponse.json({ ok: true, count: exercises.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[regenerate-exercises] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
