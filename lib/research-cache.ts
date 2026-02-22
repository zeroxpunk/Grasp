import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const BASE = process.env.LEARNING_BASE_PATH!;
const CACHE_DIR = path.join(BASE, ".cache", "research");
const TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheKey(description: string, context?: string): string {
  const input = description + (context || "");
  return crypto.createHash("md5").update(input).digest("hex");
}

function cachePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

export async function getCachedResearch(
  description: string,
  context?: string
): Promise<string | null> {
  const filePath = cachePath(cacheKey(description, context));
  try {
    await fs.access(filePath);
    const raw = await fs.readFile(filePath, "utf-8");
    const entry = JSON.parse(raw) as { results: string; createdAt: number };
    if (Date.now() - entry.createdAt > TTL_MS) return null;
    return entry.results;
  } catch {
    return null;
  }
}

export async function cacheResearch(
  description: string,
  context: string | undefined,
  results: string
): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const filePath = cachePath(cacheKey(description, context));
  await fs.writeFile(
    filePath,
    JSON.stringify({ results, createdAt: Date.now() })
  );
}
