import type { ModelRegistry } from "../registry.js";
import { executeGenerateText } from "../execution.js";
import type { ExecutionOptions } from "../shared/types.js";
import { buildContentReviewPrompt } from "../prompts/content-review.js";

export { buildContentReviewPrompt as buildPrompt };

export async function execute(
  registry: ModelRegistry,
  params: { content: string },
  options?: ExecutionOptions,
): Promise<string> {
  const { system, user } = buildContentReviewPrompt(params.content);

  return executeGenerateText({
    model: registry.resolve("primary"),
    system,
    prompt: user,
    maxOutputTokens: options?.maxOutputTokens,
    thinkingBudget: options?.thinkingBudget,
    onProgress: options?.onProgress,
    label: "content-review",
  });
}
