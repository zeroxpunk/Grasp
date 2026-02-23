import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getImageManifest, generateVisual } from "@/lib/image-gen";

const BASE = process.env.LEARNING_BASE_PATH!;

export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path: segments } = await params;
  const filename = segments.join("/");

  if (filename.includes("..") || slug.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(BASE, "courses", slug, "images", filename);

  // Fast path: file already exists on disk
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".webp" ? "image/webp" :
      "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // File not found — try on-demand generation
  }

  // Extract hash from filename (e.g. "abc123def456.png" → "abc123def456")
  const basename = path.basename(filename, path.extname(filename));
  const manifest = await getImageManifest(slug);
  const description = manifest[basename];

  if (!description) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Generate image on demand
  console.log("[course-images] on-demand generation for", basename, "in", slug);
  const visual = await generateVisual(description);

  if (!visual) {
    return new NextResponse("Image generation failed", { status: 502 });
  }

  // Save to disk for future requests
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, visual.bytes);
  console.log("[course-images] saved generated image:", filename);

  return new NextResponse(Buffer.from(visual.bytes), {
    headers: {
      "Content-Type": visual.mediaType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
