import type { GraspAI } from "../index.js";
import type { CourseManifest, Exercise } from "../shared/types.js";

export interface ExerciseGenerationInput {
  manifest: CourseManifest;
  courseMemory: string;
  lessonNumber: number;
  lessonTitle: string;
  concepts: string[];
  lessonContent: string;
  previousExerciseSummary?: string;
  language?: string;
}

export async function runExerciseGenerationPipeline(
  ai: GraspAI,
  input: ExerciseGenerationInput,
): Promise<Exercise[]> {
  let exercises = await ai.generateExercises({
    lessonTitle: input.lessonTitle,
    concepts: input.concepts,
    lessonContent: input.lessonContent,
    lessonNumber: input.lessonNumber,
    totalLessons: input.manifest.lessons.length,
    mastery: input.manifest.mastery,
    courseTitle: input.manifest.title,
    courseDescription: input.manifest.description,
    courseMemory: input.courseMemory,
    previousExerciseSummary: input.previousExerciseSummary,
  });

  if (input.language && input.language !== "en") {
    try {
      exercises = await ai.translateExercises({
        exercises: JSON.stringify(exercises),
        targetLanguage: input.language,
      });
    } catch {
      // Best-effort — keep English exercises on failure
    }
  }

  return exercises;
}
