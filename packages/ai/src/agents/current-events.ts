import type { ModelRegistry } from "../registry.js";
import { executeGenerateText } from "../execution.js";
import { buildCurrentEventsPrompt, type CurrentEventsPromptParams } from "../prompts/current-events.js";

export type CurrentEventsParams = CurrentEventsPromptParams;
export { buildCurrentEventsPrompt as buildPrompt };

const SENTINEL = "[NO_CURRENT_EVENTS]";

export async function execute(
  registry: ModelRegistry,
  params: CurrentEventsParams,
): Promise<string | null> {
  const { system, user } = buildCurrentEventsPrompt(params);
  const webSearch = registry.webSearchTool();

  let result: string;
  try {
    result = await executeGenerateText({
      model: registry.resolve("research"),
      system,
      prompt: user,
      ...(webSearch ? { tools: { web_search: webSearch }, maxSteps: 3 } : {}),
      label: "current-events",
    });
  } catch {
    // Web search may loop without producing text — not an error, just no results
    return null;
  }

  if (!result || result.includes(SENTINEL)) {
    return null;
  }

  return result;
}
