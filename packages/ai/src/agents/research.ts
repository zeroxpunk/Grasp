import type { ModelRegistry } from "../registry.js";
import { executeGenerateText } from "../execution.js";
import { buildResearchPrompt, type ResearchPromptParams } from "../prompts/research.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("research");

export type ResearchParams = ResearchPromptParams;
export { buildResearchPrompt as buildPrompt };

export async function execute(
  registry: ModelRegistry,
  params: ResearchParams,
): Promise<string> {
  const { system, user } = buildResearchPrompt(params);
  const webSearch = registry.webSearchTool();

  const result = await executeGenerateText({
    model: registry.resolve("research"),
    system,
    prompt: user,
    ...(webSearch ? { tools: { web_search: webSearch }, maxSteps: 5 } : {}),
    label: "research",
    toolResultFallback: "formatted-results",
  });

  if (result.trim().length > 0) {
    return result;
  }

  // Web search loop produced no text — retry without tools
  log.info("research returned empty with tools, retrying without web search");
  return executeGenerateText({
    model: registry.resolve("research"),
    system,
    prompt: user,
    label: "research-fallback",
  });
}
