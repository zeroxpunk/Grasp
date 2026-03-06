import type { GraspAI } from "../index.js";
import type { CourseManifest, Exercise } from "../shared/types.js";

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

  onProgress?.("generating-content");
  const rawContent = await ai.generateLessonContent({
    manifest,
    globalMemory,
    courseMemory,
    courseContext,
    lessonNumber,
  }, {
    webSearch: true,
  });

  onProgress?.("reviewing");
  const content = await ai.reviewContent(
    { content: rawContent },
    { thinkingBudget: 10000 },
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
