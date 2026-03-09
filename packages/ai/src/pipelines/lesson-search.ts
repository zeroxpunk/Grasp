import { generateText, stepCountIs } from "ai";
import type { GraspAI } from "../index.js";
import { createLogger } from "../shared/logger.js";
import type { CourseManifest } from "../shared/types.js";

const log = createLogger("lesson-search");
const LESSON_SEARCH_RESULT_LIMIT = 12;

function buildLessonSearchQueries(manifest: CourseManifest, lessonNumber: number) {
  const lesson = manifest.lessons.find((entry) => entry.number === lessonNumber);
  if (!lesson) {
    throw new Error(`Lesson ${lessonNumber} not found in ${manifest.slug}`);
  }

  const base = [
    manifest.title,
    lesson.title,
    ...lesson.concepts,
  ].join(" ");

  return [
    `${base} official docs documentation reference`,
    `${base} guide tutorial deep dive`,
    `${base} examples github repository implementation`,
    `${base} article explainer analysis`,
    `${base} youtube lecture walkthrough`,
  ];
}

export async function searchLessonMaterials(
  ai: GraspAI,
  params: {
    manifest: CourseManifest;
    lessonNumber: number;
  },
): Promise<string> {
  try {
    const queries = buildLessonSearchQueries(params.manifest, params.lessonNumber);
    const webSearch = ai.registry.webSearchTool({ maxUses: 10 });

    if (!webSearch) {
      log.info("web search not available (no Anthropic provider), skipping lesson search");
      return "";
    }

    const result = await generateText({
      model: ai.registry.resolve("research"),
      prompt: [
        `Search the web for reference materials on the following topics.`,
        `For each relevant result, provide: a numbered entry with the title, URL, and a brief summary of what it covers.`,
        `Return at most ${LESSON_SEARCH_RESULT_LIMIT} results. Focus on authoritative, recent, and practical resources.`,
        "",
        "Topics to search:",
        ...queries.map((query, index) => `${index + 1}. ${query}`),
      ].join("\n"),
      tools: {
        web_search: webSearch,
      },
      stopWhen: stepCountIs(10),
      maxOutputTokens: 8192,
    });

    const text = result.text.trim();

    log.info("lesson search completed", {
      queries,
      finishReason: result.finishReason,
      steps: result.steps.length,
      textLength: text.length,
    });

    if (text.length === 0) {
      log.info("lesson search returned no text");
      return "";
    }

    return [
      "## Web Research Materials",
      "Use these materials directly when writing the lesson.",
      "",
      "Queries used:",
      ...queries.map((query, index) => `${index + 1}. ${query}`),
      "",
      text,
    ].join("\n").trim();
  } catch (err) {
    log.info("lesson search failed, continuing without search materials", {
      error: err instanceof Error ? err.message : String(err),
    });
    return "";
  }
}
