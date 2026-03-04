import type { ModelRegistry } from "../registry.js";
import { executeGenerateText } from "../execution.js";
import { buildResearchPrompt, type ResearchPromptParams } from "../prompts/research.js";

export type ResearchParams = ResearchPromptParams;
export { buildResearchPrompt as buildPrompt };

export async function execute(
  registry: ModelRegistry,
  params: ResearchParams,
): Promise<string> {
  const { system, user } = buildResearchPrompt(params);

  return executeGenerateText({
    model: registry.resolve("research"),
    system,
    prompt: user,
    tools: { web_search: registry.webSearchTool() },
    maxSteps: 5,
    label: "research",
  });
}
