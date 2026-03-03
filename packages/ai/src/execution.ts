import { streamText, generateText, Output, stepCountIs } from "ai";
import type { LanguageModel, ToolSet } from "ai";
import type { z } from "zod";
import type { StreamEvent } from "./shared/types.js";
import { createLogger } from "./shared/logger.js";

const log = createLogger("execution");

function thinkingOptions(budget?: number) {
  if (!budget) return {};
  return {
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled" as const, budgetTokens: budget },
      },
    },
  };
}

export async function executeGenerateText(opts: {
  model: LanguageModel;
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  tools?: ToolSet;
  maxSteps?: number;
  onProgress?: () => void;
  label?: string;
}): Promise<string> {
  const stop = log.time(opts.label || "generateText");
  const thinking = thinkingOptions(opts.thinkingBudget);
  const toolOpts = opts.tools
    ? { tools: opts.tools, stopWhen: stepCountIs(opts.maxSteps || 5) }
    : {};

  if (opts.onProgress) {
    const result = streamText({
      model: opts.model,
      ...(opts.system ? { system: opts.system } : {}),
      prompt: opts.prompt,
      maxOutputTokens: opts.maxOutputTokens,
      ...thinking,
      ...toolOpts,
    });

    let accumulated = "";
    let lastReport = 0;

    for await (const delta of result.textStream) {
      accumulated += delta;
      if (accumulated.length - lastReport >= 500) {
        lastReport = accumulated.length;
        opts.onProgress!();
      }
    }

    stop();
    log.info(`${opts.label || "generateText"} done`, { length: accumulated.length });
    return accumulated;
  }

  const result = await generateText({
    model: opts.model,
    ...(opts.system ? { system: opts.system } : {}),
    prompt: opts.prompt,
    maxOutputTokens: opts.maxOutputTokens,
    ...thinking,
    ...toolOpts,
  });

  stop();
  log.info(`${opts.label || "generateText"} done`, { length: result.text.length });
  return result.text;
}

export async function executeGenerateStructured<T>(opts: {
  model: LanguageModel;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName?: string;
  schemaDescription?: string;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  onProgress?: () => void;
  label?: string;
}): Promise<T> {
  const stop = log.time(opts.label || "structured");
  const thinking = thinkingOptions(opts.thinkingBudget);

  log.info(`generating structured: ${opts.label || opts.schemaName || "unnamed"}`, {
    thinkingBudget: opts.thinkingBudget,
    maxOutputTokens: opts.maxOutputTokens,
  });

  if (opts.onProgress) {
    const result = streamText({
      model: opts.model,
      system: opts.system,
      prompt: opts.prompt,
      maxOutputTokens: opts.maxOutputTokens,
      ...thinking,
      output: Output.object({
        schema: opts.schema,
        name: opts.schemaName,
        description: opts.schemaDescription,
      }),
    });

    let count = 0;
    for await (const _partial of result.partialOutputStream) {
      count++;
      if (count % 3 === 0) {
        opts.onProgress!();
      }
    }

    const output = await result.output;
    if (!output) throw new Error("No structured output generated");

    stop();
    return output;
  }

  const { output } = await generateText({
    model: opts.model,
    system: opts.system,
    prompt: opts.prompt,
    maxOutputTokens: opts.maxOutputTokens,
    ...thinking,
    output: Output.object({
      schema: opts.schema,
      name: opts.schemaName,
      description: opts.schemaDescription,
    }),
  });

  if (!output) throw new Error("No structured output generated");

  stop();
  return output;
}

export async function executeGenerateJson(opts: {
  model: LanguageModel;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  label?: string;
}): Promise<unknown[]> {
  const stop = log.time(opts.label || "json");
  const thinking = thinkingOptions(opts.thinkingBudget);

  const result = await generateText({
    model: opts.model,
    system: opts.system + "\n\nIMPORTANT: Output ONLY a JSON array. No markdown fences, no explanation, no preamble. Just the raw JSON array.",
    prompt: opts.prompt,
    maxOutputTokens: opts.maxOutputTokens,
    ...thinking,
  });

  let text = result.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  stop();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `[${opts.label || "json"}] Failed to parse JSON. Raw output (first 200 chars): ${text.slice(0, 200)}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`[${opts.label || "json"}] Expected JSON array, got ${typeof parsed}`);
  }

  return parsed;
}

export function streamEventsToSSE(events: AsyncIterable<StreamEvent>): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          switch (event.type) {
            case "text-delta":
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: event.text })}\n\n`)
              );
              break;
            case "exercise-status":
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ exerciseStatus: { exerciseId: event.exerciseId, status: event.status } })}\n\n`)
              );
              break;
            case "done":
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              break;
            case "error":
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: event.message })}\n\n`)
              );
              break;
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
        controller.close();
      }
    },
  });
}
