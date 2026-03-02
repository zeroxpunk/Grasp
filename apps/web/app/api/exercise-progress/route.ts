import { NextResponse } from "next/server";
import { getLessonExercises, updateExerciseProgress } from "@/lib/courses";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { courseSlug, lessonNumber, exerciseId, completed } = await req.json();

    if (!courseSlug || typeof courseSlug !== "string") {
      return NextResponse.json({ error: "courseSlug required" }, { status: 400 });
    }
    if (!lessonNumber || typeof lessonNumber !== "number") {
      return NextResponse.json({ error: "lessonNumber required" }, { status: 400 });
    }
    if (typeof exerciseId !== "number") {
      return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
    }
    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "completed (boolean) required" }, { status: 400 });
    }

    const exercises = await getLessonExercises(courseSlug, lessonNumber);
    const exists = exercises.some((ex) => ex.id === exerciseId);
    if (!exists) {
      return NextResponse.json({ error: "exerciseId not found in lesson" }, { status: 404 });
    }

    await updateExerciseProgress(courseSlug, lessonNumber, [{ exerciseId, completed }]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[exercise-progress] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
