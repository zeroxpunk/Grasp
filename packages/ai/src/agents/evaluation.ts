import type { ModelRegistry } from "../registry.js";
import { executeGenerateStructured } from "../execution.js";
import { evaluationSchema, type EvaluationOutput } from "../shared/schemas.js";
import type { ExecutionOptions } from "../shared/types.js";
import { buildEvaluationPrompt, type EvaluationPromptParams } from "../prompts/evaluation.js";

export type EvaluationParams = EvaluationPromptParams;
export { buildEvaluationPrompt as buildPrompt };

export async function execute(
  registry: ModelRegistry,
  params: EvaluationParams,
  options?: ExecutionOptions,
): Promise<EvaluationOutput> {
  const { system, user } = buildEvaluationPrompt(params);

  return executeGenerateStructured({
    model: registry.resolve("primary"),
    system,
    prompt: user,
    schema: evaluationSchema,
    schemaName: "SessionEvaluation",
    schemaDescription: "Evaluation of a completed learning session",
    maxOutputTokens: options?.maxOutputTokens,
    thinkingBudget: options?.thinkingBudget,
    onProgress: options?.onProgress,
    label: "evaluation",
  });
}
