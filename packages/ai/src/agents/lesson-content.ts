import type { ModelRegistry } from "../registry.js";
import { executeGenerateText } from "../execution.js";
import type { ExecutionOptions } from "../shared/types.js";
import {
  buildInitialLessonPrompt,
  buildOnDemandLessonPrompt,
  type InitialLessonPromptParams,
  type OnDemandLessonPromptParams,
} from "../prompts/lesson-content.js";

export type InitialLessonParams = InitialLessonPromptParams;
export { buildInitialLessonPrompt as buildInitialPrompt };

export async function executeInitial(
  registry: ModelRegistry,
  params: InitialLessonParams,
  options?: ExecutionOptions,
): Promise<string> {
  const { system, user } = buildInitialLessonPrompt(params);

  return executeGenerateText({
    model: registry.resolve("primary"),
    system,
    prompt: user,
    maxOutputTokens: options?.maxOutputTokens ?? 65536,
    thinkingBudget: options?.thinkingBudget ?? 32768,
    onProgress: options?.onProgress,
    label: "lesson-content:initial",
  });
}

export type OnDemandLessonParams = OnDemandLessonPromptParams;
export { buildOnDemandLessonPrompt as buildOnDemandPrompt };

export async function executeOnDemand(
  registry: ModelRegistry,
  params: OnDemandLessonParams,
  options?: ExecutionOptions & { webSearch?: boolean },
): Promise<string> {
  const { system, user } = buildOnDemandLessonPrompt(params);

  return executeGenerateText({
    model: registry.resolve("primary"),
    system,
    prompt: user,
    maxOutputTokens: options?.maxOutputTokens,
    thinkingBudget: options?.thinkingBudget,
    onProgress: options?.onProgress,
    ...(options?.webSearch
      ? { tools: { web_search: registry.webSearchTool() }, maxSteps: 5 }
      : {}),
    label: "lesson-content:on-demand",
  });
}
