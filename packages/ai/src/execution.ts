import { streamText, generateText, Output, stepCountIs } from "ai";
import type { LanguageModel, ToolSet } from "ai";
import type { z } from "zod";
import type { StreamEvent } from "./shared/types.js";
import { createLogger } from "./shared/logger.js";

const log = createLogger("execution");

type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };
type ProviderOptions = Record<string, Record<string, JSONValue>>;

function budgetToReasoningEffort(budget: number): "low" | "medium" | "high" {
  if (budget <= 4096) return "low";
  if (budget <= 16384) return "medium";
  return "high";
}

export function resolveProviderOptions(
  model: LanguageModel,
  budget?: number,
): ProviderOptions | undefined {
  if (!budget) return undefined;

  const provider = getModelProvider(model);

  if (provider?.startsWith("anthropic")) {
    return {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: budget },
      },
    };
  }

  if (provider?.startsWith("openai")) {
    return {
      openai: {
        reasoningEffort: budgetToReasoningEffort(budget),
      },
    };
  }

  return undefined;
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
  const providerOptions = resolveProviderOptions(opts.model, opts.thinkingBudget);
  const toolOpts = opts.tools
    ? { tools: opts.tools, stopWhen: stepCountIs(opts.maxSteps || 5) }
    : {};

  function buildIncompleteToolLoopWarning(params: {
    finishReason: string;
    text: string;
    toolCalls: Array<{ toolName: string }>;
    toolResultsCount: number;
  }) {
    return [
      `[${opts.label || "generateText"}]`,
      `Incomplete tool generation: finishReason=${params.finishReason}.`,
      `toolCalls=${params.toolCalls.map((toolCall) => toolCall.toolName).join(",") || "none"}.`,
      `toolResults=${params.toolResultsCount}.`,
      `textLength=${params.text.length}.`,
    ].join(" ");
  }

  if (opts.onProgress) {
    const result = streamText({
      model: opts.model,
      ...(opts.system ? { system: opts.system } : {}),
      prompt: opts.prompt,
      maxOutputTokens: opts.maxOutputTokens,
      ...(providerOptions ? { providerOptions } : {}),
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

    const finishReason = await result.finishReason;
    const toolCalls = await result.toolCalls;
    const toolResults = await result.toolResults;

    stop();
    log.info(`${opts.label || "generateText"} done`, {
      length: accumulated.length,
      finishReason,
      toolCalls: toolCalls.map((toolCall) => toolCall.toolName),
      toolResults: toolResults.length,
    });

    if (opts.tools && finishReason === "tool-calls" && accumulated.trim().length === 0) {
      log.info(buildIncompleteToolLoopWarning({
        finishReason,
        text: accumulated,
        toolCalls,
        toolResultsCount: toolResults.length,
      }));

      if (toolResults.length > 0) {
        const outputs = toolResults.map((tr) => tr.output);
        log.info(`retrying with ${outputs.length} tool result(s) in prompt`);

        const retry = streamText({
          model: opts.model,
          ...(opts.system ? { system: opts.system } : {}),
          prompt: `${opts.prompt}\n\nWeb search results:\n${JSON.stringify(outputs, null, 2)}`,
          maxOutputTokens: opts.maxOutputTokens,
          ...(providerOptions ? { providerOptions } : {}),
        });

        accumulated = "";
        lastReport = 0;
        for await (const delta of retry.textStream) {
          accumulated += delta;
          if (accumulated.length - lastReport >= 500) {
            lastReport = accumulated.length;
            opts.onProgress!();
          }
        }

        return accumulated;
      }
    }

    return accumulated;
  }

  const result = await generateText({
    model: opts.model,
    ...(opts.system ? { system: opts.system } : {}),
    prompt: opts.prompt,
    maxOutputTokens: opts.maxOutputTokens,
    ...(providerOptions ? { providerOptions } : {}),
    ...toolOpts,
  });

  const finishReason = result.finishReason;
  const toolCalls = result.toolCalls;
  const toolResults = result.toolResults;

  stop();
  log.info(`${opts.label || "generateText"} done`, {
    length: result.text.length,
    finishReason,
    toolCalls: toolCalls.map((toolCall) => toolCall.toolName),
    toolResults: toolResults.length,
  });

  if (opts.tools && finishReason === "tool-calls" && result.text.trim().length === 0) {
    log.info(buildIncompleteToolLoopWarning({
      finishReason,
      text: result.text,
      toolCalls,
      toolResultsCount: toolResults.length,
    }));

    // Provider-defined tools (e.g. gateway perplexitySearch) execute server-side
    // and return results in a single step without the model synthesizing text.
    // Retry without tools, embedding the search results in the prompt.
    if (toolResults.length > 0) {
      const outputs = toolResults.map((tr) => tr.output);
      log.info(`retrying with ${outputs.length} tool result(s) in prompt`);

      const retry = await generateText({
        model: opts.model,
        ...(opts.system ? { system: opts.system } : {}),
        prompt: `${opts.prompt}\n\nWeb search results:\n${JSON.stringify(outputs, null, 2)}`,
        maxOutputTokens: opts.maxOutputTokens,
        ...(providerOptions ? { providerOptions } : {}),
      });

      return retry.text;
    }
  }

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
  const providerOptions = resolveProviderOptions(opts.model, opts.thinkingBudget);

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
      ...(providerOptions ? { providerOptions } : {}),
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
    ...(providerOptions ? { providerOptions } : {}),
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
  const providerOptions = resolveProviderOptions(opts.model, opts.thinkingBudget);

  const result = await generateText({
    model: opts.model,
    system: opts.system + "\n\nIMPORTANT: Output ONLY a JSON array. No markdown fences, no explanation, no preamble. Just the raw JSON array.",
    prompt: opts.prompt,
    maxOutputTokens: opts.maxOutputTokens,
    ...(providerOptions ? { providerOptions } : {}),
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

function getModelProvider(model: LanguageModel) {
  if (typeof model !== "object" || model === null) {
    return null;
  }

  if (isProviderModel(model)) {
    return model.provider;
  }

  return null;
}

function isProviderModel(model: object): model is { provider: string } {
  return "provider" in model && typeof (model as { provider?: unknown }).provider === "string";
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
