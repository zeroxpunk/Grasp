import { buildLessonAgentPrompt } from "@/lib/agents";
import { streamChat } from "@/lib/ai";
import { updateExerciseProgress } from "@/lib/courses";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { messages, lessonContent, lessonTitle, courseSlug, lessonNumber, exercises, exerciseProgress } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!lessonContent || !lessonTitle || !courseSlug) {
      return new Response(
        JSON.stringify({ error: "lessonContent, lessonTitle, and courseSlug are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = await buildLessonAgentPrompt(courseSlug, lessonContent, lessonTitle, exercises, exerciseProgress);

    const conversationText = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`
      )
      .join("\n\n");

    const userPrompt = `Here is the conversation so far:\n\n${conversationText}\n\nContinue as the Tutor. Respond to the student's latest message.`;

    const readable = streamChat({
      systemPrompt,
      prompt: userPrompt,
      onExerciseStatus: async (exerciseId, status) => {
        if (lessonNumber) {
          await updateExerciseProgress(courseSlug, lessonNumber, [
            { exerciseId, completed: status === "completed" },
          ]);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

