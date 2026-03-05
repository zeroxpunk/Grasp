function extractErrorDetails(err: unknown): { message: string; cause?: string } {
  if (!(err instanceof Error)) return { message: String(err) };

  const details: { message: string; cause?: string } = { message: err.message };

  if (err.cause) {
    details.cause = err.cause instanceof Error ? err.cause.message : String(err.cause);
  }

  return details;
}

export function createLogger(tag: string) {
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
