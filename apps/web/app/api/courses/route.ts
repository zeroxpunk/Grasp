import { NextResponse } from "next/server";
import {
  listCourses,
  createCourseDirectory,
  writeCourseManifest,
  writeCourseContext,
  writeCourseMemory,
  writeLessonContent,
  writeLessonExercises,
  getGlobalMemory,
} from "@/lib/courses";
import {
  buildResearchPrompt,
  buildCoursePlanPrompt,
  buildInitialLessonContentPrompt,
  buildExerciseGenerationPrompt,
} from "@/lib/agents";
import { research, generateStructured, generateMarkdown, generateExercisesJson, reviewContent, enhanceLessonTitles } from "@/lib/ai";
import { coursePlanSchema } from "@/lib/schemas";
import { processMarkdownVisuals } from "@/lib/image-gen";
import { normalizeExercises } from "@/lib/exercises";
import { getCachedResearch, cacheResearch } from "@/lib/research-cache";
import { createLogger } from "@/lib/logger";
import type { CourseManifest, LessonEntry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

const log = createLogger("course-create");

export async function GET() {
  const courses = await listCourses();
  return NextResponse.json(courses);
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  function sendEvent(data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const readable = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(sendEvent(data));
      }

      try {
        const { description, context } = await req.json();

        if (!description || typeof description !== "string") {
          send({ error: "Description is required" });
          controller.close();
          return;
        }

        // ── Step 1: Research (with cache) ──

        let researchResults: string;

        const cached = await getCachedResearch(description, context);
        if (cached) {
          send({ step: "researching", message: "Using cached research..." });
          researchResults = cached;
          log.info("research cache hit", { length: cached.length });
        } else {
          send({ step: "researching", message: "Searching for learning materials..." });
          try {
            const { systemPrompt, userPrompt } = buildResearchPrompt(description, context);
            researchResults = await research({ systemPrompt, prompt: userPrompt });
            await cacheResearch(description, context, researchResults);
            log.info("research done + cached", { length: researchResults.length });
          } catch (err) {
            log.error("research failed", err);
            const msg = err instanceof Error ? err.message : "Research failed";
            send({ error: `Research failed: ${msg}` });
            controller.close();
            return;
          }
        }

        // ── Step 2: Course plan — Opus + extended thinking ──

        send({ step: "generating", message: "Designing course structure..." });

        const globalMemory = await getGlobalMemory();
        const { systemPrompt: planSystemPrompt, userPrompt: planUserPrompt } = buildCoursePlanPrompt(
          description,
          researchResults,
          context,
          globalMemory
        );

        let plan;
        try {
          plan = await generateStructured({
            systemPrompt: planSystemPrompt,
            prompt: planUserPrompt,
            schema: coursePlanSchema,
            schemaName: "CoursePlan",
            schemaDescription: "A structured course plan with 8-16 lessons",
            maxOutputTokens: 32768,
            thinkingBudget: 16384,
            onProgress: () => {
              send({ step: "generating", alive: true });
            },
          });
          log.info("plan generated", { title: plan.title, lessonCount: plan.lessons.length });
        } catch (err) {
          log.error("plan generation failed", err);
          const msg = err instanceof Error ? err.message : "Course plan generation failed";
          send({ error: msg });
          controller.close();
          return;
        }

        // ── Step 2.5: Polish lesson titles with Gemini Flash ──

        send({ step: "generating", message: "Polishing lesson titles..." });
        try {
          const enhanced = await enhanceLessonTitles(
            plan.title,
            plan.lessons.map((l, i) => ({ number: l.number || i + 1, title: l.title }))
          );
          for (let i = 0; i < plan.lessons.length; i++) {
            plan.lessons[i].title = enhanced[i];
          }
          log.info("lesson titles polished");
        } catch (err) {
          log.info("title enhancement failed, keeping originals", { error: err instanceof Error ? err.message : err });
        }

        // ── Step 3: Write manifest BEFORE content generation ──

        const slug = plan.slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const lessons: LessonEntry[] = plan.lessons.map((l, i) => ({
          number: l.number || i + 1,
          slug: l.slug,
          title: l.title,
          concepts: l.concepts || [],
          status: "not_created" as const,
        }));

        const manifest: CourseManifest = {
          slug,
          title: plan.title,
          description: plan.description,
          createdAt: new Date().toISOString(),
          lessons,
          mastery: {},
        };

        for (const lesson of lessons) {
          for (const concept of lesson.concepts) {
            manifest.mastery[concept] = 0;
          }
        }

        await createCourseDirectory(slug);
        await writeCourseManifest(manifest);

        if (context) {
          await writeCourseContext(slug, context);
        }

        await writeCourseMemory(
          slug,
          `# Course Memory: ${plan.title}\n\nThis file tracks insights, learning preferences, and patterns as you progress through the course.\n`
        );

        log.info("manifest written", { slug });

        // ── Step 4: Lesson 1 content — Opus + extended thinking ──

        const lesson1 = lessons[0];

        send({ step: "writing", message: `Writing lesson 1: "${lesson1.title}"...` });

        const { systemPrompt: lessonSystemPrompt, userPrompt: lessonUserPrompt } = buildInitialLessonContentPrompt({
          description,
          researchMaterials: researchResults,
          context,
          globalMemory,
          coursePlan: plan,
          lessonNumber: lesson1.number,
          lessonTitle: lesson1.title,
          concepts: lesson1.concepts,
        });

        const rawContent = await generateMarkdown({
          systemPrompt: lessonSystemPrompt,
          prompt: lessonUserPrompt,
          maxOutputTokens: 65536,
          thinkingBudget: 32768,
          onProgress: () => {
            send({ step: "writing", alive: true });
          },
        });

        send({ step: "polishing", message: "Polishing content..." });
        const reviewedContent = await reviewContent({ content: rawContent, thinkingBudget: 10000 });

        const content = await processMarkdownVisuals(reviewedContent, slug);
        await writeLessonContent(slug, lesson1, content);
        log.info("lesson 1 content written", { length: content.length });

        // Mark lesson 1 as ready — even if exercises fail, the lesson is accessible
        lesson1.status = "not_started";
        await writeCourseManifest(manifest);

        // ── Step 5: Lesson 1 exercises — best-effort ──

        try {
          send({ step: "writing", message: "Creating exercises..." });

          const exerciseSystemPrompt = buildExerciseGenerationPrompt({
            lessonTitle: lesson1.title,
            concepts: lesson1.concepts,
            lessonContent: content,
            lessonNumber: 1,
            totalLessons: plan.lessons.length,
            mastery: {},
            courseTitle: plan.title,
            courseDescription: plan.description,
          });

          const rawExercises = await generateExercisesJson({
            systemPrompt: exerciseSystemPrompt,
            prompt: `Generate exercises for Lesson 1: "${lesson1.title}". Concepts: ${lesson1.concepts.join(", ")}.`,
            maxOutputTokens: 32768,
            thinkingBudget: 10000,
          });

          const exercises = normalizeExercises(rawExercises as Record<string, unknown>[]);
          await writeLessonExercises(slug, lesson1, exercises);
          log.info("lesson 1 exercises written", { count: exercises.length });
        } catch (err) {
          log.error("exercise generation failed (lesson still accessible)", err);
        }

        // ── Step 6: Done ──

        log.info("done", { slug, title: plan.title, lessonCount: lessons.length });

        send({
          step: "done",
          slug,
          title: plan.title,
          lessonCount: lessons.length,
        });
        controller.close();
      } catch (err) {
        log.error("unexpected error", err);
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(sendEvent({ error: msg }));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
