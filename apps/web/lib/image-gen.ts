import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateImage } from "ai";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

const BASE = process.env.LEARNING_BASE_PATH!;
const VISUAL_REGEX = /\[DIAGRAM:\s*(.+)\]/g;
const FAILED_VISUAL_REGEX = /\*\[Visual:\s*(.+)\]\*/g;

/**
 * Generates a visual (diagram, architecture, flow, memory layout, etc.)
 * from a text description using Imagen 4.
 * Returns raw image bytes and media type, or null on failure.
 */
export async function generateVisual(
  description: string
): Promise<{ bytes: Uint8Array; mediaType: string; alt: string } | null> {
  console.log("[image-gen] generating visual:", description.slice(0, 80));

  try {
    const result = await generateImage({
      model: google.image("gemini-3-pro-image-preview"),
      prompt: `Clean, minimal technical diagram on a pure white background. Sans-serif font. Flat design, no gradients or shadows. Thin lines (1-2px), muted colors (grays, soft blues, subtle accents). Generous whitespace. Crisp readable labels. Apple documentation style.\n\n${description}`,
      n: 1,
      aspectRatio: "16:9",
    });

    const image = result.images[0];
    if (image) {
      return { bytes: image.uint8Array, mediaType: "image/png", alt: description };
    }

    console.log("[image-gen] no image in response");
    return null;
  } catch (err) {
    console.error("[image-gen] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function hasUnresolvedVisuals(markdown: string): boolean {
  return VISUAL_REGEX.test(markdown) || FAILED_VISUAL_REGEX.test(markdown);
}

/**
 * Reads the image manifest for a course. Returns hash→description map.
 */
export async function getImageManifest(courseSlug: string): Promise<Record<string, string>> {
  const manifestPath = path.join(BASE, "courses", courseSlug, "images", "manifest.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Merges new entries into the image manifest (additive, never removes).
 */
async function updateImageManifest(courseSlug: string, entries: Record<string, string>): Promise<void> {
  const imagesDir = path.join(BASE, "courses", courseSlug, "images");
  await fs.mkdir(imagesDir, { recursive: true });
  const manifestPath = path.join(imagesDir, "manifest.json");

  const existing = await getImageManifest(courseSlug);
  const merged = { ...existing, ...entries };
  await fs.writeFile(manifestPath, JSON.stringify(merged, null, 2));
}

const RESOLVED_IMAGE_REGEX = /!\[([^\]]*)\]\(\/api\/course-images\/[^/]+\/([a-f0-9]+)\.png\)/g;

/**
 * Scans already-resolved image references in markdown and backfills the manifest.
 * This handles old courses created before lazy generation — their content has
 * ![description](/api/course-images/slug/hash.png) but no manifest.json.
 */
export async function ensureImageManifest(markdown: string, courseSlug: string): Promise<void> {
  const matches = [...markdown.matchAll(RESOLVED_IMAGE_REGEX)];
  if (matches.length === 0) return;

  const existing = await getImageManifest(courseSlug);
  const newEntries: Record<string, string> = {};

  for (const match of matches) {
    const alt = match[1].trim();
    const hash = match[2];
    if (!existing[hash] && alt) {
      newEntries[hash] = alt;
    }
  }

  if (Object.keys(newEntries).length > 0) {
    await updateImageManifest(courseSlug, newEntries);
    console.log("[image-gen] backfilled manifest for", courseSlug, "—", Object.keys(newEntries).length, "entries");
  }
}

/**
 * Lightweight transform: scans markdown for [DIAGRAM: ...] markers,
 * computes content hashes, writes a manifest mapping hash→description,
 * and replaces markers with image URLs — but does NOT generate any images.
 *
 * Images are generated on-demand by the /api/course-images serving endpoint.
 */
export async function processMarkdownVisuals(
  markdown: string,
  courseSlug: string
): Promise<string> {
  let normalized = markdown.replace(FAILED_VISUAL_REGEX, (_m, desc: string) => `[DIAGRAM: ${desc}]`);
  const matches = [...normalized.matchAll(VISUAL_REGEX)];
  if (matches.length === 0) return markdown;

  const manifestEntries: Record<string, string> = {};
  let result = normalized;

  for (const match of matches) {
    const fullMatch = match[0];
    const description = match[1].trim();
    const safeAlt = description.replace(/[\[\]]/g, "");
    const hash = crypto.createHash("md5").update(description).digest("hex").slice(0, 12);
    const filename = `${hash}.png`;

    manifestEntries[hash] = description;
    result = result.replace(fullMatch, `![${safeAlt}](/api/course-images/${courseSlug}/${filename})`);
  }

  await updateImageManifest(courseSlug, manifestEntries);
  console.log("[image-gen] manifest updated for", courseSlug, "—", Object.keys(manifestEntries).length, "entries");

  return result;
}

