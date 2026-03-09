import { streamText, generateText, Output, stepCountIs } from "ai";
import type { LanguageModel, ToolSet } from "ai";
import type { z } from "zod";
import type { StreamEvent } from "./shared/types.js";
import { createLogger } from "./shared/logger.js";

const log = createLogger("execution");

type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };
type ProviderOptions = Record<string, Record<string, JSONValue>>;

interface SearchResult {
  type?: string;
  title?: string | null;
  url?: string;
  pageAge?: string | null;
  snippet?: string;
}

/**
 * Format raw tool outputs into a concise text summary suitable for re-injection
 * into a prompt. Handles both Claude web search results (array of results)
 * and legacy formats ({ results: [...] }).
 */
function formatToolResultsForRetry(outputs: unknown[]): string {
  const lines: string[] = [];

  for (const output of outputs) {
    const results: SearchResult[] = Array.isArray(output)
      ? output as SearchResult[]
      : ((output as Record<string, unknown> | null)?.results ?? []) as SearchResult[];

    for (const r of results) {
      const title = typeof r.title === "string" ? r.title.trim() : undefined;
      const url = r.url?.trim();
      const snippet = r.snippet?.replace(/\s+/g, " ").trim().slice(0, 300);
      if (!title && !url) continue;
      if (title) lines.push(`### ${title}`);
      if (url) lines.push(url);
      if (r.pageAge) lines.push(`Date: ${r.pageAge}`);
      if (snippet) lines.push(snippet);
      lines.push("");
    }
  }

  // Cap at ~30K chars to avoid blowing up context
  const joined = lines.join("\n");
  return joined.length > 30_000 ? joined.slice(0, 30_000) + "\n..." : joined;
}

function budgetToReasoningEffort(budget: number): "low" | "medium" | "high" {
  if (budget <= 4096) return "low";
  if (budget <= 16384) return "medium";
  return "high";
}

function wrapExecutionError(label: string, err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (message.startsWith(`[${label}]`)) {
    return err instanceof Error ? err : new Error(message);
  }

  return new Error(`[${label}] ${message}`, {
    cause: err instanceof Error ? err : undefined,
  });
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
  toolResultFallback?: "formatted-results";
}): Promise<string> {
  const label = opts.label || "generateText";
  const stop = log.time(label);
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
      `[${label}]`,
      `Incomplete tool generation: finishReason=${params.finishReason}.`,
      `toolCalls=${params.toolCalls.map((toolCall) => toolCall.toolName).join(",") || "none"}.`,
      `toolResults=${params.toolResultsCount}.`,
      `textLength=${params.text.length}.`,
    ].join(" ");
  }

  function buildToolResultsPrompt(outputs: unknown[]) {
    return `${opts.prompt}\n\nWeb search results:\n${formatToolResultsForRetry(outputs)}`;
  }

  function fallbackFromToolResults(outputs: unknown[]) {
    if (opts.toolResultFallback !== "formatted-results") {
      return "";
    }

    return formatToolResultsForRetry(outputs).trim();
  }

  async function retryFromToolResults(
    toolResults: Array<{ output: unknown }>,
    generate: () => Promise<string>,
  ) {
    const outputs = toolResults.map((tr) => tr.output);
    log.info(`retrying with ${outputs.length} tool result(s) in prompt`);

    try {
      const text = (await generate()).trim();
      if (text.length > 0) {
        return text;
      }
    } catch (err) {
      log.error(`${label} retry after tool results failed`, err);
      const fallback = fallbackFromToolResults(outputs);
      if (fallback.length > 0) {
        log.info(`${label} using formatted tool results fallback`, {
          length: fallback.length,
          toolResults: outputs.length,
        });
        return fallback;
      }

      throw wrapExecutionError(label, err);
    }

    const fallback = fallbackFromToolResults(outputs);
    if (fallback.length > 0) {
      log.info(`${label} using formatted tool results fallback`, {
        length: fallback.length,
        toolResults: outputs.length,
      });
      return fallback;
    }

    return "";
  }

  try {
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
      log.info(`${label} done`, {
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
          return retryFromToolResults(
            toolResults,
            async () => {
              const retry = streamText({
                model: opts.model,
                ...(opts.system ? { system: opts.system } : {}),
                prompt: buildToolResultsPrompt(toolResults.map((tr) => tr.output)),
                maxOutputTokens: opts.maxOutputTokens,
                ...(providerOptions ? { providerOptions } : {}),
              });

              let retryAccumulated = "";
              let retryLastReport = 0;
              for await (const delta of retry.textStream) {
                retryAccumulated += delta;
                if (retryAccumulated.length - retryLastReport >= 500) {
                  retryLastReport = retryAccumulated.length;
                  opts.onProgress!();
                }
              }

              return retryAccumulated;
            },
          );
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
    log.info(`${label} done`, {
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

      // Provider-defined tools (e.g. Anthropic web search) execute server-side
      // and may return results without the model synthesizing text.
      // Retry without tools, embedding the search results in the prompt.
      if (toolResults.length > 0) {
        return retryFromToolResults(
          toolResults,
          async () => {
            const retry = await generateText({
              model: opts.model,
              ...(opts.system ? { system: opts.system } : {}),
              prompt: buildToolResultsPrompt(toolResults.map((tr) => tr.output)),
              maxOutputTokens: opts.maxOutputTokens,
              ...(providerOptions ? { providerOptions } : {}),
            });

            return retry.text;
          },
        );
      }
    }

    return result.text;
  } catch (err) {
    log.error(`${label} failed`, err);
    throw wrapExecutionError(label, err);
  }
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
  const label = opts.label || "structured";
  const stop = log.time(label);
  const providerOptions = resolveProviderOptions(opts.model, opts.thinkingBudget);

  log.info(`generating structured: ${label || opts.schemaName || "unnamed"}`, {
    thinkingBudget: opts.thinkingBudget,
    maxOutputTokens: opts.maxOutputTokens,
  });

  try {
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
  } catch (err) {
    log.error(`${label} failed`, err);
    throw wrapExecutionError(label, err);
  }
}

export async function executeGenerateJson(opts: {
  model: LanguageModel;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  label?: string;
}): Promise<unknown[]> {
  const label = opts.label || "json";
  const stop = log.time(label);
  const providerOptions = resolveProviderOptions(opts.model, opts.thinkingBudget);

  try {
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
        `[${label}] Failed to parse JSON. Raw output (first 200 chars): ${text.slice(0, 200)}`
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`[${label}] Expected JSON array, got ${typeof parsed}`);
    }

    return parsed;
  } catch (err) {
    log.error(`${label} failed`, err);
    throw wrapExecutionError(label, err);
  }
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
