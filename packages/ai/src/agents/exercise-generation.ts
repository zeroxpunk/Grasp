import type { ModelRegistry } from "../registry.js";
import { executeGenerateJson } from "../execution.js";
import { normalizeExercises } from "../shared/exercises.js";
import type { Exercise, ExecutionOptions } from "../shared/types.js";
import {
  buildExerciseGenerationPrompt,
  type ExerciseGenerationPromptParams,
} from "../prompts/exercise-generation.js";

export type ExerciseGenParams = ExerciseGenerationPromptParams;
export { buildExerciseGenerationPrompt as buildPrompt };

export async function execute(
  registry: ModelRegistry,
  params: ExerciseGenParams,
  options?: ExecutionOptions,
): Promise<Exercise[]> {
  const { system, user } = buildExerciseGenerationPrompt(params);

  const raw = await executeGenerateJson({
    model: registry.resolve("primary"),
    system,
    prompt: user,
    maxOutputTokens: options?.maxOutputTokens ?? 32768,
    thinkingBudget: options?.thinkingBudget,
    label: "exercise-generation",
  });

  return normalizeExercises(raw as Record<string, unknown>[]);
}
