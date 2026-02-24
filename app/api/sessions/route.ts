import { NextResponse } from "next/server";
import { startSession, endSession, getSessionStats } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getSessionStats();
  return NextResponse.json(stats);
}

export async function POST(req: Request) {
  const { action, courseSlug } = await req.json();

  if (action === "start") {
    const session = await startSession(courseSlug);
    return NextResponse.json({ ok: true, session });
  }

  if (action === "end") {
    const session = await endSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "no active session" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, session });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
