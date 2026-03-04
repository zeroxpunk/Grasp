import type { ModelRegistry } from "../registry.js";
import { executeGenerateText } from "../execution.js";
import {
  buildTitleEnhancementPrompt,
  type TitleEnhancementPromptParams,
} from "../prompts/title-enhancement.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("title-enhancement");

export type TitleEnhancementParams = TitleEnhancementPromptParams;
export { buildTitleEnhancementPrompt as buildPrompt };

export async function execute(
  registry: ModelRegistry,
  params: TitleEnhancementParams,
): Promise<string[]> {
  const originals = params.lessons.map((l) => l.title);

  try {
    const text = await executeGenerateText({
      model: registry.resolve("fast"),
      prompt: buildTitleEnhancementPrompt(params),
      label: "title-enhancement",
    });

    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length !== params.lessons.length) {
      log.info("enhanced titles length mismatch", { expected: params.lessons.length, got: parsed?.length });
      return originals;
    }

    log.info("lesson titles enhanced", { count: parsed.length });
    return parsed.map((t: unknown) => (typeof t === "string" ? t : String(t)));
  } catch (err) {
    log.info("title enhancement failed, keeping originals", { error: err instanceof Error ? err.message : err });
    return originals;
  }
}
