import type { GraspAI } from "../index.js";
import type { CourseManifest, Exercise } from "../shared/types.js";
import { searchLessonMaterials } from "./lesson-search.js";

export interface LessonGenerationInput {
  manifest: CourseManifest;
  globalMemory: string;
  courseMemory: string;
  courseContext: string;
  lessonNumber: number;
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
  const { manifest, globalMemory, courseMemory, courseContext, lessonNumber } = input;

  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) {
    throw new Error(`Lesson ${lessonNumber} not found in manifest`);
  }

  const searchContext = await searchLessonMaterials(ai, { manifest, lessonNumber });

  const effectiveCourseContext = [courseContext, searchContext]
    .filter((value) => value && value.trim().length > 0)
    .join("\n\n");

  const lessonParams = {
    manifest,
    globalMemory,
    courseMemory,
    courseContext: effectiveCourseContext,
    lessonNumber,
  };

  onProgress?.("generating-content");
  const rawContent = await ai.generateLessonContent(lessonParams, {
    webSearch: false,
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
    });
  } catch {
    // Best-effort
  }

  onProgress?.("done");

  return { content, exercises };
}
