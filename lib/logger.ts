/**
 * Tagged logger with timing and AI SDK error detail extraction.
 */

interface Logger {
  info: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, err?: unknown) => void;
  time: (label: string) => () => number;
}

function extractErrorDetails(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) return { raw: String(err) };

  const details: Record<string, unknown> = { message: err.message };

  // AI SDK error fields
  const e = err as unknown as Record<string, unknown>;
  if (e.statusCode) details.statusCode = e.statusCode;
  if (e.responseHeaders) {
    const h = e.responseHeaders as Record<string, string>;
    details.requestId = h["request-id"] || h["x-request-id"];
    details.shouldRetry = h["x-should-retry"];
    details.upstreamTime = h["x-envoy-upstream-service-time"];
  }
  if (e.cause) {
    details.cause = e.cause instanceof Error ? e.cause.message : String(e.cause);
  }
  if (e.retryCount !== undefined) details.retryCount = e.retryCount;

  return details;
}

export function createLogger(tag: string): Logger {
  return {
    info(msg: string, data?: Record<string, unknown>) {
      if (data) {
        console.log(`[${tag}] ${msg}`, JSON.stringify(data));
      } else {
        console.log(`[${tag}] ${msg}`);
      }
    },

    error(msg: string, err?: unknown) {
      if (err) {
        console.error(`[${tag}] ${msg}`, extractErrorDetails(err));
      } else {
        console.error(`[${tag}] ${msg}`);
      }
    },

    time(label: string) {
      const start = Date.now();
      return () => {
        const elapsed = Date.now() - start;
        console.log(`[${tag}] ${label}: ${elapsed}ms`);
        return elapsed;
      };
    },
  };
}
