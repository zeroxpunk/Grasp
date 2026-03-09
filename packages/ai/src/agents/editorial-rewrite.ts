import type { ModelRegistry } from "../registry.js";
import { executeGenerateText } from "../execution.js";
import type { ExecutionOptions } from "../shared/types.js";
import { buildEditorialRewritePrompt, type EditorialRewriteParams } from "../prompts/editorial-rewrite.js";

export type { EditorialRewriteParams };
export { buildEditorialRewritePrompt as buildPrompt };

export async function execute(
  registry: ModelRegistry,
  params: EditorialRewriteParams,
  options?: ExecutionOptions,
): Promise<string> {
  const { system, user } = buildEditorialRewritePrompt(params);

  return executeGenerateText({
    model: registry.resolve("primary"),
    system,
    prompt: user,
    maxOutputTokens: options?.maxOutputTokens,
    thinkingBudget: options?.thinkingBudget,
    onProgress: options?.onProgress,
    label: "editorial-rewrite",
  });
}
