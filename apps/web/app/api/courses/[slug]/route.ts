import { NextResponse } from "next/server";
import { getCourseManifest } from "@/lib/courses";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const manifest = await getCourseManifest(slug);
    return NextResponse.json(manifest);
  } catch {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
}
