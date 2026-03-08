import type { GraspAI } from "../index.js";
import type { CourseManifest, Exercise } from "../shared/types.js";
import { searchLessonMaterials } from "./lesson-search.js";

export interface LessonGenerationInput {
  manifest: CourseManifest;
  globalMemory: string;
  courseMemory: string;
  courseContext: string;
  lessonNumber: number;
  previousExerciseSummary?: string;
}

export interface LessonGenerationOutput {
  content: string;
  exercises: Exercise[];
}

export async function runLessonGenerationPipeline(
  ai: GraspAI,
  input: LessonGenerationInput,
  onProgress?: (step: string) => void,
): Promise<LessonGenerationOutput> {
  const {
    manifest,
    globalMemory,
    courseMemory,
    courseContext,
    lessonNumber,
    previousExerciseSummary,
  } = input;

  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) {
    throw new Error(`Lesson ${lessonNumber} not found in manifest`);
  }

  const searchContext = await searchLessonMaterials(ai, { manifest, lessonNumber });

  const previousLessons = manifest.lessons
    .filter((entry) => entry.number < lessonNumber)
    .filter((entry) => entry.status === "completed" || entry.status === "started")
    .map((entry) => `- Lesson ${entry.number}: ${entry.title} [${entry.status}]`);

  const masteryText = Object.entries(manifest.mastery)
    .map(([concept, score]) => `- ${concept}: ${score}`)
    .join("\n");

  const adaptiveContext = [
    courseContext.trim(),
    masteryText
      ? `## Current Mastery Levels\n${masteryText}`
      : "## Current Mastery Levels\nNo mastery data yet.",
    `## Course Memory\n${courseMemory.trim() || "No course memory yet."}`,
    previousLessons.length > 0
      ? `## Previous Lessons Completed\n${previousLessons.join("\n")}`
      : "## Previous Lessons Completed\nNone yet.",
  ]
    .filter((value) => value && value.trim().length > 0)
    .join("\n\n");

  const lessonParams = {
    description: manifest.description,
    researchMaterials: searchContext,
    context: adaptiveContext || null,
    globalMemory,
    coursePlan: {
      title: manifest.title,
      description: manifest.description,
      lessons: manifest.lessons.map((entry) => ({
        number: entry.number,
        title: entry.title,
        concepts: entry.concepts,
      })),
    },
    lessonNumber,
    lessonTitle: lesson.title,
    concepts: lesson.concepts,
  };

  onProgress?.("generating-content");
  const rawContent = await ai.generateInitialLessonContent(lessonParams, {
    maxOutputTokens: 65536,
    thinkingBudget: 32768,
  });

  onProgress?.("reviewing");
  const content = await ai.reviewContent(
    { content: rawContent },
    { maxOutputTokens: 65536, thinkingBudget: 10000 },
  );

  onProgress?.("generating-exercises");
  let exercises: Exercise[] = [];
  try {
    exercises = await ai.generateExercises({
      lessonTitle: lesson.title,
      concepts: lesson.concepts,
      lessonContent: content,
      lessonNumber,
      totalLessons: manifest.lessons.length,
      mastery: manifest.mastery,
      courseTitle: manifest.title,
      courseDescription: manifest.description,
      courseMemory,
      previousExerciseSummary,
    }, {
      maxOutputTokens: 32768,
      thinkingBudget: 10000,
    });
  } catch {
    // Best-effort
  }

  onProgress?.("done");

  return { content, exercises };
}
