import { NextResponse } from "next/server";
import { generateVisual } from "@/lib/image-gen";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description string is required" },
        { status: 400 }
      );
    }

    const result = await generateVisual(description);

    if (!result) {
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: 502 }
      );
    }

    const base64 = Buffer.from(result.bytes).toString("base64");
    const dataUrl = `data:${result.mediaType};base64,${base64}`;

    return NextResponse.json({ dataUrl, alt: result.alt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-image] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
