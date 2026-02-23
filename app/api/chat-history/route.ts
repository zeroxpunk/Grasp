import { NextResponse } from "next/server";
import { getLessonChat, saveLessonChat } from "@/lib/courses";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const lesson = searchParams.get("lesson");

  if (!slug || !lesson) {
    return NextResponse.json({ error: "slug and lesson required" }, { status: 400 });
  }

  const messages = await getLessonChat(slug, parseInt(lesson, 10));
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  try {
    const { courseSlug, lessonNumber, messages } = await req.json();

    if (!courseSlug || !lessonNumber || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "courseSlug, lessonNumber, and messages required" },
        { status: 400 }
      );
    }

    await saveLessonChat(courseSlug, lessonNumber, messages);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
