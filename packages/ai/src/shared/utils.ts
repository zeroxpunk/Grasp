export function lazy<T>(init: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= init());
}
