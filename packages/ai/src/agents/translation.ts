import type { ModelRegistry } from "../registry.js";
import { executeGenerateText, executeGenerateJson } from "../execution.js";
import { normalizeExercises } from "../shared/exercises.js";
import type { Exercise, ExecutionOptions } from "../shared/types.js";
import {
  buildContentTranslationPrompt,
  buildExerciseTranslationPrompt,
  type ContentTranslationParams,
  type ExerciseTranslationParams,
} from "../prompts/translation.js";

export type { ContentTranslationParams, ExerciseTranslationParams };

export async function executeContentTranslation(
  registry: ModelRegistry,
  params: ContentTranslationParams,
  options?: ExecutionOptions,
): Promise<string> {
  const { system, user } = buildContentTranslationPrompt(params);

  return executeGenerateText({
    model: registry.resolve("primary"),
    system,
    prompt: user,
    maxOutputTokens: options?.maxOutputTokens,
    thinkingBudget: options?.thinkingBudget,
    onProgress: options?.onProgress,
    label: "translation",
  });
}

export async function executeExerciseTranslation(
  registry: ModelRegistry,
  params: ExerciseTranslationParams,
): Promise<Exercise[]> {
  const { system, user } = buildExerciseTranslationPrompt(params);

  const raw = await executeGenerateJson({
    model: registry.resolve("fast"),
    system,
    prompt: user,
    maxOutputTokens: 32768,
    label: "exercise-translation",
  });

  return normalizeExercises(raw as Record<string, unknown>[]);
}
