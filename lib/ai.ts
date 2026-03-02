import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, generateText, Output, stepCountIs } from "ai";
import { z } from "zod";
import { createLogger } from "./logger";
import { buildContentReviewPrompt } from "./agents";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = "claude-opus-4-6";
const RESEARCH_MODEL = "claude-sonnet-4-6";

const log = createLogger("ai");

/**
 * Streams a chat response as SSE for the lesson tutor.
 * Supports tool calls (e.g. update_exercise_status) that execute server-side
 * and emit special SSE events for the client.
 */
export function streamChat({
  systemPrompt,
  prompt,
  onExerciseStatus,
}: {
  systemPrompt: string;
  prompt: string;
  onExerciseStatus?: (exerciseId: number, status: "attempted" | "completed") => Promise<void>;
}): ReadableStream {
  const encoder = new TextEncoder();

  const result = streamText({
    model: anthropic(MODEL),
    system: systemPrompt,
    prompt,
    tools: {
      update_exercise_status: {
        description: "Update the status of an exercise after evaluating the learner's answer. Call this whenever you evaluate an exercise attempt — mark as 'completed' if the answer demonstrates correct understanding, or 'attempted' if the answer has significant errors.",
        inputSchema: z.object({
          exerciseId: z.number().describe("The exercise ID number"),
          status: z.enum(["attempted", "completed"]).describe("'completed' if the answer is correct, 'attempted' if incorrect or incomplete"),
        }),
        execute: async ({ exerciseId, status }: { exerciseId: number; status: "attempted" | "completed" }) => {
          await onExerciseStatus?.(exerciseId, status);
          return { ok: true as const, exerciseId, status };
        },
      },
    },
    stopWhen: stepCountIs(3),
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: part.text })}\n\n`)
            );
          } else if (part.type === "tool-result" && part.toolName === "update_exercise_status") {
            const res = (part as unknown as { output: { exerciseId: number; status: string } }).output;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ exerciseStatus: { exerciseId: res.exerciseId, status: res.status } })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        log.error("stream error", err);
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
        controller.close();
      }
    },
  });
}

/**
 * Web research agent. Uses Anthropic's web search tool to find
 * relevant materials, resources, and references for a topic.
 */
export async function research({
  systemPrompt,
  prompt,
}: {
  systemPrompt: string;
  prompt: string;
}): Promise<string> {
  const stop = log.time("research");

  const result = await generateText({
    model: anthropic(RESEARCH_MODEL),
    system: systemPrompt,
    prompt,
    tools: {
      web_search: anthropic.tools.webSearch_20250305(),
    },
    stopWhen: stepCountIs(5),
  });

  stop();
  log.info("research done", { outputLength: result.text.length, steps: result.steps.length });
  return result.text;
}

/**
 * Builds providerOptions for extended thinking when a budget is set.
 */
function thinkingProviderOptions(thinkingBudget?: number) {
  if (!thinkingBudget) return {};
  return {
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled" as const, budgetTokens: thinkingBudget },
      },
    },
  };
}

/**
 * Generates a typed object using structured output (Zod schema).
 * Uses Output.object for schema-validated generation —
 * no manual JSON parsing needed.
 */
export async function generateStructured<T>({
  systemPrompt,
  prompt,
  schema,
  schemaName,
  schemaDescription,
  onProgress,
  model: modelOverride,
  maxOutputTokens,
  thinkingBudget,
}: {
  systemPrompt: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName?: string;
  schemaDescription?: string;
  onProgress?: () => void;
  model?: "opus" | "sonnet";
  maxOutputTokens?: number;
  thinkingBudget?: number;
}): Promise<T> {
  const selectedModel = modelOverride === "sonnet" ? RESEARCH_MODEL : MODEL;
  const stop = log.time(`structured:${schemaName || "unnamed"}`);
  log.info("generating structured", { schema: schemaName, model: selectedModel, thinkingBudget, maxOutputTokens });

  const model = anthropic(selectedModel);
  const thinking = thinkingProviderOptions(thinkingBudget);

  if (onProgress) {
    const result = streamText({
      model,
      system: systemPrompt,
      prompt,
      maxOutputTokens,
      ...thinking,
      output: Output.object({
        schema,
        name: schemaName,
        description: schemaDescription,
      }),
    });

    let count = 0;
    for await (const _partial of result.partialOutputStream) {
      count++;
      if (count % 3 === 0) {
        onProgress();
      }
    }

    const output = await result.output;
    if (!output) throw new Error("No structured output generated");

    stop();
    return output;
  }

  const { output } = await generateText({
    model,
    system: systemPrompt,
    prompt,
    maxOutputTokens,
    ...thinking,
    output: Output.object({
      schema,
      name: schemaName,
      description: schemaDescription,
    }),
  });

  if (!output) throw new Error("No structured output generated");

  stop();
  return output;
}

/**
 * Generates raw markdown text. Used for lesson content generation
 * where the output is unstructured markdown, not JSON.
 */
export async function generateMarkdown({
  systemPrompt,
  prompt,
  webSearch = false,
  onProgress,
  maxOutputTokens,
  thinkingBudget,
}: {
  systemPrompt: string;
  prompt: string;
  webSearch?: boolean;
  onProgress?: () => void;
  maxOutputTokens?: number;
  thinkingBudget?: number;
}): Promise<string> {
  const stop = log.time("markdown");
  log.info("generating markdown", { webSearch, thinkingBudget, maxOutputTokens });

  const model = anthropic(MODEL);
  const thinking = thinkingProviderOptions(thinkingBudget);

  if (onProgress) {
    const result = streamText({
      model,
      system: systemPrompt,
      prompt,
      maxOutputTokens,
      ...thinking,
      ...(webSearch
        ? {
            tools: { web_search: anthropic.tools.webSearch_20250305() },
            stopWhen: stepCountIs(5),
          }
        : {}),
    });

    let accumulated = "";
    let lastReport = 0;

    for await (const delta of result.textStream) {
      accumulated += delta;
      if (accumulated.length - lastReport >= 500) {
        lastReport = accumulated.length;
        onProgress();
      }
    }

    stop();
    log.info("markdown done", { length: accumulated.length });
    return accumulated;
  }

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
    maxOutputTokens,
    ...thinking,
    ...(webSearch
      ? {
          tools: { web_search: anthropic.tools.webSearch_20250305() },
          stopWhen: stepCountIs(5),
        }
      : {}),
  });

  stop();
  log.info("markdown done", { length: result.text.length });
  return result.text;
}

/**
 * Content review agent — "Steve Jobs" polish pass.
 * Takes raw lesson markdown, sends it through Opus with extended thinking,
 * and returns polished markdown with aesthetic issues fixed.
 */
export async function reviewContent({
  content,
  thinkingBudget,
}: {
  content: string;
  thinkingBudget?: number;
}): Promise<string> {
  const stop = log.time("review");
  log.info("reviewing content", { contentLength: content.length, thinkingBudget });

  const { systemPrompt, userPrompt } = buildContentReviewPrompt(content);
  const thinking = thinkingProviderOptions(thinkingBudget);

  const result = await generateText({
    model: anthropic(MODEL),
    system: systemPrompt,
    prompt: userPrompt,
    ...thinking,
  });

  stop();
  log.info("review done", { inputLength: content.length, outputLength: result.text.length });
  return result.text;
}

/**
 * Generates exercises via plain text generation + JSON parsing.
 * Fallback for when structured output fails with complex schemas.
 * Uses Opus for quality, parses the JSON from the response.
 */
export async function generateExercisesJson({
  systemPrompt,
  prompt,
  maxOutputTokens,
  thinkingBudget,
}: {
  systemPrompt: string;
  prompt: string;
  maxOutputTokens?: number;
  thinkingBudget?: number;
}): Promise<unknown[]> {
  const stop = log.time("exercises");
  log.info("generating exercises", { thinkingBudget, maxOutputTokens });

  const model = anthropic(MODEL);
  const thinking = thinkingProviderOptions(thinkingBudget);

  const result = await generateText({
    model,
    system: systemPrompt + "\n\nIMPORTANT: Output ONLY a JSON array. No markdown fences, no explanation, no preamble. Just the raw JSON array.",
    prompt,
    maxOutputTokens,
    ...thinking,
  });

  let text = result.text.trim();
  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  stop();
  log.info("exercises parsed", { length: text.length });
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array from exercise generation");
  }

  return parsed;
}

/**
 * Rewrites lesson titles to be catchier using Gemini Flash.
 * Best-effort — returns original titles on any failure.
 */
export async function enhanceLessonTitles(
  courseTitle: string,
  lessons: { number: number; title: string }[]
): Promise<string[]> {
  const originals = lessons.map((l) => l.title);

  try {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_AI_API_KEY!,
    });

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: `Rewrite these lesson titles for a course called "${courseTitle}". Make them catchier and more engaging, 3-7 words each. Keep the original meaning. Return ONLY a JSON array of strings, no markdown fences.\n\nOriginal titles:\n${lessons.map((l) => `${l.number}. ${l.title}`).join("\n")}`,
    });

    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length !== lessons.length) {
      log.info("enhanced titles length mismatch", { expected: lessons.length, got: parsed?.length });
      return originals;
    }

    log.info("lesson titles enhanced", { count: parsed.length });
    return parsed.map((t: unknown) => (typeof t === "string" ? t : String(t)));
  } catch (err) {
    log.info("enhance lesson titles failed, keeping originals", { error: err instanceof Error ? err.message : err });
    return originals;
  }
}

