import type { GraspAI } from "../index.js";
import type { CoursePlanOutput } from "../shared/schemas.js";
import type { Exercise } from "../shared/types.js";

export interface CourseCreationInput {
  description: string;
  context?: string;
  globalMemory: string;
  cachedResearch?: string;
}

export interface CourseCreationPipelineOutput {
  research: string;
  plan: CoursePlanOutput;
  enhancedTitles: string[];
  firstLessonContent: string;
  firstLessonExercises: Exercise[];
  courseMemory: string;
}

export async function runCourseCreationPipeline(
  ai: GraspAI,
  input: CourseCreationInput,
  onProgress?: (step: string) => void,
): Promise<CourseCreationPipelineOutput> {
  const { description, context, globalMemory, cachedResearch } = input;

  onProgress?.("researching");
  const research = cachedResearch ?? await ai.research({ description, context });

  onProgress?.("planning");
  const plan = await ai.planCourse({
    description,
    researchMaterials: research,
    context,
    globalMemory,
  }, {
    maxOutputTokens: 32768,
    thinkingBudget: 16384,
  });

  onProgress?.("enhancing-titles");
  const enhancedTitles = await ai.enhanceTitles({
    courseTitle: plan.title,
    lessons: plan.lessons.map((lesson, index) => ({
      number: lesson.number || index + 1,
      title: lesson.title,
    })),
  });

  const firstLesson = plan.lessons[0];
  if (!firstLesson) {
    throw new Error("Generated course plan contained no lessons");
  }

  const coursePlanLessons = plan.lessons.map((lesson, index) => ({
    number: lesson.number || index + 1,
    title: enhancedTitles[index] || lesson.title,
    concepts: lesson.concepts,
  }));

  const initialLessonParams = {
    description,
    researchMaterials: research,
    context: context ?? null,
    globalMemory,
    coursePlan: {
      title: plan.title,
      description: plan.description,
      lessons: coursePlanLessons,
    },
    lessonNumber: firstLesson.number || 1,
    lessonTitle: enhancedTitles[0] || firstLesson.title,
    concepts: firstLesson.concepts,
  };

  onProgress?.("generating-first-lesson");
  const rawFirstLessonContent = await ai.generateInitialLessonContent(initialLessonParams, {
    maxOutputTokens: 65536,
    thinkingBudget: 32768,
  });

  onProgress?.("reviewing");
  const firstLessonContent = await ai.reviewContent(
    { content: rawFirstLessonContent },
    {
      maxOutputTokens: 65536,
      thinkingBudget: 10000,
    },
  );

  onProgress?.("generating-exercises");
  let firstLessonExercises: Exercise[] = [];
  try {
    firstLessonExercises = await ai.generateExercises({
      lessonTitle: enhancedTitles[0] || firstLesson.title,
      concepts: firstLesson.concepts,
      lessonContent: firstLessonContent,
      lessonNumber: firstLesson.number || 1,
      totalLessons: plan.lessons.length,
      mastery: {},
      courseTitle: plan.title,
      courseDescription: plan.description,
    }, {
      maxOutputTokens: 32768,
      thinkingBudget: 10000,
    });
  } catch {
    // Best-effort: return empty if exercise generation fails
  }

  const courseMemory = ai.prompts.courseMemory(plan.title);

  onProgress?.("done");

  return {
    research,
    plan,
    enhancedTitles,
    firstLessonContent,
    firstLessonExercises,
    courseMemory,
  };
}
