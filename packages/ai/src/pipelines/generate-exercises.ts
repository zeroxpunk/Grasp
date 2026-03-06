import type { GraspAI } from "../index.js";
import type { CourseManifest, Exercise } from "../shared/types.js";

export interface ExerciseGenerationInput {
  manifest: CourseManifest;
  courseMemory: string;
  lessonNumber: number;
  lessonTitle: string;
  concepts: string[];
  lessonContent: string;
}

export async function runExerciseGenerationPipeline(
  ai: GraspAI,
  input: ExerciseGenerationInput,
): Promise<Exercise[]> {
  return ai.generateExercises({
    lessonTitle: input.lessonTitle,
    concepts: input.concepts,
    lessonContent: input.lessonContent,
    lessonNumber: input.lessonNumber,
    totalLessons: input.manifest.lessons.length,
    mastery: input.manifest.mastery,
    courseTitle: input.manifest.title,
    courseDescription: input.manifest.description,
    courseMemory: input.courseMemory,
  });
}
