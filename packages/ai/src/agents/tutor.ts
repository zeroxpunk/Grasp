import { streamText, stepCountIs } from "ai";
import { z } from "zod";
import { resolveProviderOptions } from "../execution.js";
import type { ModelRegistry } from "../registry.js";
import type { StreamEvent } from "../shared/types.js";
import {
  buildTutorConversationPrompt,
  buildTutorSystemPrompt,
  type TutorPromptMessage,
  type TutorSystemPromptParams,
} from "../prompts/tutor.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("tutor");
const TUTOR_MAX_OUTPUT_TOKENS = 2048;
const TUTOR_THINKING_BUDGET = 32768;
const TUTOR_MAX_STEPS = 3;

export interface TutorParams extends TutorSystemPromptParams {
  messages: TutorPromptMessage[];
}

export interface TutorCallbacks {
  onExerciseStatus?: (exerciseId: number, status: "attempted" | "completed") => Promise<void>;
}

export { buildTutorSystemPrompt as buildPrompt };

export async function* execute(
  registry: ModelRegistry,
  params: TutorParams,
  callbacks?: TutorCallbacks,
): AsyncGenerator<StreamEvent> {
  const { messages, ...promptParams } = params;
  const systemPrompt = buildTutorSystemPrompt(promptParams);
  const userPrompt = buildTutorConversationPrompt(messages);
  const model = registry.resolve("primary");
  const providerOptions = resolveProviderOptions(model, TUTOR_THINKING_BUDGET);

  const result = streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: TUTOR_MAX_OUTPUT_TOKENS,
    ...(providerOptions ? { providerOptions } : {}),
    tools: {
      update_exercise_status: {
        description: "Update the status of an exercise after evaluating the learner's answer. Call this whenever you evaluate an exercise attempt — mark as 'completed' if the answer demonstrates correct understanding, or 'attempted' if the answer has significant errors.",
        inputSchema: z.object({
          exerciseId: z.number().describe("The exercise ID number"),
          status: z.enum(["attempted", "completed"]).describe("'completed' if the answer is correct, 'attempted' if incorrect or incomplete"),
        }),
        execute: async ({ exerciseId, status }: { exerciseId: number; status: "attempted" | "completed" }) => {
          await callbacks?.onExerciseStatus?.(exerciseId, status);
          return { ok: true as const, exerciseId, status };
        },
      },
    },
    stopWhen: stepCountIs(TUTOR_MAX_STEPS),
  });

  try {
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        yield { type: "text-delta", text: part.text };
      } else if (part.type === "tool-result" && part.toolName === "update_exercise_status") {
        const res = (part as unknown as { output: { exerciseId: number; status: "attempted" | "completed" } }).output;
        yield { type: "exercise-status", exerciseId: res.exerciseId, status: res.status };
      }
    }
    yield { type: "done" };
  } catch (err) {
    log.error("stream error", err);
    yield { type: "error", message: err instanceof Error ? err.message : "Stream error" };
  }
}
