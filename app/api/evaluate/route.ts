import { NextResponse } from "next/server";
import { buildEvaluationPrompt, buildLessonGenerationPrompt, buildExerciseGenerationPrompt } from "@/lib/agents";
import { generateStructured, generateMarkdown, generateExercisesJson, reviewContent } from "@/lib/ai";
import { evaluationSchema } from "@/lib/schemas";
import { normalizeExercises } from "@/lib/exercises";
import { processMarkdownVisuals } from "@/lib/image-gen";
import {
  getCourseManifest,
  writeCourseManifest,
  writeLessonContent,
  writeLessonExercises,
  updateMastery,
  appendInsightsToMemory,
  updateExerciseProgress,
  getLessonExercises,
  getLessonExerciseProgress,
  getCourseMemory,
} from "@/lib/courses";
import type { LessonEntry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { conversationSummary, lessonNumber, courseSlug } = await req.json();

    if (!conversationSummary || typeof conversationSummary !== "string") {
      return NextResponse.json(
        { error: "conversationSummary string is required" },
        { status: 400 }
      );
    }
    if (!lessonNumber || typeof lessonNumber !== "number") {
      return NextResponse.json(
        { error: "lessonNumber (number) is required" },
        { status: 400 }
      );
    }
    if (!courseSlug || typeof courseSlug !== "string") {
      return NextResponse.json(
        { error: "courseSlug string is required" },
        { status: 400 }
      );
    }

    const systemPrompt = await buildEvaluationPrompt(
      courseSlug,
      conversationSummary,
      lessonNumber
    );

    const manifest = await getCourseManifest(courseSlug);
    const lesson = manifest.lessons.find((l) => l.number === lessonNumber);

    const evaluation = await generateStructured({
      systemPrompt,
      prompt: `Evaluate the session for Lesson ${lessonNumber}: "${lesson?.title || "Unknown"}".`,
      schema: evaluationSchema,
      schemaName: "SessionEvaluation",
      schemaDescription: "Evaluation of a completed learning session",
    });

    console.log("[evaluate] result:", evaluation.recommendation, "complete:", evaluation.lessonComplete);

    const masteryRecord: Record<string, number> = {};
    for (const mu of evaluation.masteryUpdates) {
      masteryRecord[mu.concept] = mu.level;
    }
    await updateMastery(courseSlug, masteryRecord);
    await appendInsightsToMemory(courseSlug, evaluation.insights);

    if (evaluation.exercisesAttempted && evaluation.exercisesAttempted.length > 0) {
      await updateExerciseProgress(courseSlug, lessonNumber, evaluation.exercisesAttempted);
    }

    const lessonExercises = await getLessonExercises(courseSlug, lessonNumber);
    if (lessonExercises.length > 0 && evaluation.lessonComplete) {
      const progress = await getLessonExerciseProgress(courseSlug, lessonNumber);
      const allAttempted = lessonExercises.every((ex) => ex.id in progress);
      if (!allAttempted) {
        evaluation.lessonComplete = false;
        console.log("[evaluate] overriding lessonComplete=false: not all exercises attempted", {
          total: lessonExercises.length,
          attempted: Object.keys(progress).length,
        });
      }
    }

    const freshManifest = await getCourseManifest(courseSlug);
    const currentLesson = freshManifest.lessons.find((l) => l.number === lessonNumber);
    if (currentLesson) {
      currentLesson.status = evaluation.lessonComplete ? "completed" : "failed";
    }

    if (evaluation.planChanges && evaluation.planChanges.length > 0) {
      for (const change of evaluation.planChanges) {
        if (change.action === "add" && change.lessonTitle) {
          const afterIdx = change.afterLesson
            ? freshManifest.lessons.findIndex((l) => l.number === change.afterLesson)
            : freshManifest.lessons.length - 1;

          const newLesson: LessonEntry = {
            number: (change.afterLesson || freshManifest.lessons.length) + 1,
            slug: change.lessonTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
            title: change.lessonTitle,
            concepts: change.concepts || [],
            status: "not_created",
          };

          freshManifest.lessons.splice(afterIdx + 1, 0, newLesson);
          for (let i = afterIdx + 2; i < freshManifest.lessons.length; i++) {
            freshManifest.lessons[i].number = i + 1;
          }
        } else if (change.action === "skip") {
          const skipLesson = freshManifest.lessons.find(
            (l) => l.title === change.lessonTitle && l.status === "not_created"
          );
          if (skipLesson) {
            skipLesson.status = "completed";
          }
        }
      }
    }

    await writeCourseManifest(freshManifest);

    if (evaluation.lessonComplete) {
      const nextLesson = freshManifest.lessons.find(
        (l) => l.status === "not_created"
      );
      if (nextLesson) {
        generateNextLesson(courseSlug, nextLesson.number).catch((err) => {
          console.error("[evaluate] background lesson generation failed:", err);
        });
      }
    }

    return NextResponse.json({ ok: true, evaluation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[evaluate] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateNextLesson(
  courseSlug: string,
  lessonNumber: number
): Promise<void> {
  console.log("[evaluate] generating next lesson:", lessonNumber);

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

  const manifest = await getCourseManifest(courseSlug);
  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) return;

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
    console.log("[evaluate] exercises generated for lesson", lessonNumber);
  } catch (err) {
    console.error("[evaluate] exercise generation failed (non-fatal):", err);
  }

  console.log("[evaluate] lesson", lessonNumber, "generated and saved");
}

