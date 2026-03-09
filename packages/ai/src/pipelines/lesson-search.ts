import { generateText, stepCountIs } from "ai";
import type { GraspAI } from "../index.js";
import type { WebSearchToolConfig } from "../registry.js";
import { createLogger } from "../shared/logger.js";
import type { CourseManifest } from "../shared/types.js";

const log = createLogger("lesson-search");
const LESSON_SEARCH_RESULT_LIMIT = 12;
const LESSON_SEARCH_TOOL_CONFIG: WebSearchToolConfig = {
  maxResults: 20,
  maxTokensPerPage: 2048,
  maxTokens: 1_000_000,
};

interface SearchResultItem {
  title?: string;
  url?: string;
  snippet?: string;
  date?: string;
  lastUpdated?: string;
  last_updated?: string;
}

interface SearchToolOutput {
  id?: string;
  results?: SearchResultItem[];
  error?: string;
  message?: string;
}

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

function uniqueResults(results: SearchResultItem[]) {
  const seen = new Set<string>();
  const deduped: SearchResultItem[] = [];

  for (const result of results) {
    const url = result.url?.trim();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    deduped.push(result);
  }

  return deduped;
}

function formatLessonSearchMaterials(queries: string[], results: SearchResultItem[]) {
  const lines = [
    "## Web Research Materials",
    "Use these materials directly when writing the lesson.",
    "",
    "Queries used:",
    ...queries.map((query, index) => `${index + 1}. ${query}`),
    "",
  ];

  for (const [index, result] of results.slice(0, LESSON_SEARCH_RESULT_LIMIT).entries()) {
    const title = result.title?.trim() || `Result ${index + 1}`;
    const url = result.url?.trim() || "";
    const snippet = result.snippet?.replace(/\s+/g, " ").trim() || "";
    const date = result.date || result.lastUpdated || result.last_updated || "";

    lines.push(`### ${index + 1}. ${title}`);
    if (url) lines.push(url);
    if (date) lines.push(`Date: ${date}`);
    if (snippet) lines.push(snippet);
    lines.push("");
  }

  return lines.join("\n").trim();
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
    const webSearch = ai.registry.webSearchTool(LESSON_SEARCH_TOOL_CONFIG);

    if (!webSearch) {
      log.info("web search not available (no gateway key), skipping lesson search");
      return "";
    }

    const result = await generateText({
      model: ai.registry.resolve("primary"),
      prompt: [
        "Call the web_search tool exactly once.",
        "Use the queries exactly as written as a single query array.",
        "Do not write any prose.",
        "Queries:",
        ...queries.map((query, index) => `${index + 1}. ${query}`),
      ].join("\n"),
      tools: {
        web_search: webSearch,
      },
      stopWhen: stepCountIs(3),
      maxOutputTokens: 8192,
    });

    const searchOutput = result.toolResults.find(
      (toolResult) => toolResult.toolName === "web_search",
    )?.output as SearchToolOutput | undefined;

    if (searchOutput?.error) {
      log.info("lesson search tool returned error", { error: searchOutput.message || searchOutput.error });
      return "";
    }

    const results = uniqueResults(searchOutput?.results ?? []);
    log.info("lesson search completed", {
      queries,
      finishReason: result.finishReason,
      toolResults: result.toolResults.length,
      resultCount: results.length,
    });

    if (results.length === 0) {
      log.info("lesson search returned no results", { queries });
      return "";
    }

    return formatLessonSearchMaterials(queries, results);
  } catch (err) {
    log.info("lesson search failed, continuing without search materials", {
      error: err instanceof Error ? err.message : String(err),
    });
    return "";
  }
}
