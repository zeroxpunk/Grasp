import type { GraspAI } from "../index.js";
import type { CoursePlanOutput } from "../shared/schemas.js";
import type { Exercise } from "../shared/types.js";

export interface CourseCreationInput {
  description: string;
  context?: string;
  globalMemory: string;
  cachedResearch?: string;
  language?: string;
  writingSamples?: string[];
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
  const { cachedResearch, language, writingSamples } = input;
  let { description, context, globalMemory } = input;

  // Translate inputs to English if target language is not English
  if (language && language !== "en") {
    const parts = [description, context ?? "", globalMemory];
    const delimiter = "\n\n---\n\n";
    const combined = parts.join(delimiter);

    const translated = await ai.translateContent(
      { content: combined, targetLanguage: "English" },
      { maxOutputTokens: 16384 },
    );

    const translatedParts = translated.split(delimiter);
    description = translatedParts[0] ?? description;
    context = translatedParts[1] || context;
    globalMemory = translatedParts[2] ?? globalMemory;
  }

  onProgress?.("researching");
  const research = cachedResearch ?? await ai.research({ description, context });

  onProgress?.("planning");
  let plan = await ai.planCourse({
    description,
    researchMaterials: research,
    context,
    globalMemory,
  }, {
    maxOutputTokens: 32768,
    thinkingBudget: 16384,
  });

  onProgress?.("enhancing-titles");
  let enhancedTitles = await ai.enhanceTitles({
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

  const courseMemory = ai.prompts.courseMemory(plan.title);

  onProgress?.("generating-first-lesson");
  const rawFirstLessonContent = await ai.generateInitialLessonContent(initialLessonParams, {
    maxOutputTokens: 65536,
    thinkingBudget: 32768,
  });

  onProgress?.("reviewing");
  let firstLessonContent = await ai.reviewContent(
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
      courseMemory,
    }, {
      maxOutputTokens: 32768,
      thinkingBudget: 10000,
    });
  } catch {
    // Best-effort: return empty if exercise generation fails
  }
  if (language && language !== "en") {
    onProgress?.("translating");

    // Translate first lesson content
    firstLessonContent = await ai.translateContent(
      { content: firstLessonContent, targetLanguage: language, writingSamples },
      { maxOutputTokens: 65536 },
    );

    // Translate exercises (best-effort)
    try {
      firstLessonExercises = await ai.translateExercises({
        exercises: JSON.stringify(firstLessonExercises),
        targetLanguage: language,
      });
    } catch {
      // Best-effort — keep English exercises on failure
    }

    // Translate plan metadata: title, description, and enhanced titles
    const metadataBlock = [
      `# ${plan.title}`,
      plan.description,
      "---",
      ...enhancedTitles.map((t, i) => `${i + 1}. ${t}`),
    ].join("\n\n");

    const translatedMetadata = await ai.translateContent(
      { content: metadataBlock, targetLanguage: language, writingSamples },
      { maxOutputTokens: 8192 },
    );

    const metadataLines = translatedMetadata.split("\n\n");
    const titleLine = metadataLines[0];
    if (titleLine?.startsWith("# ")) {
      plan = { ...plan, title: titleLine.slice(2).trim() };
    }
    const descLine = metadataLines[1];
    if (descLine && descLine !== "---") {
      plan = { ...plan, description: descLine.trim() };
    }

    // Parse translated titles back — they come after the "---" separator
    const separatorIdx = metadataLines.indexOf("---");
    if (separatorIdx !== -1) {
      const titleLines = metadataLines.slice(separatorIdx + 1);
      enhancedTitles = titleLines
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((t) => t.length > 0);
    }
  }

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
