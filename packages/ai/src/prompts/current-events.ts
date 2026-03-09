export interface CurrentEventsPromptParams {
  courseTitle: string;
  lessonTitle: string;
  concepts: string[];
  courseDescription: string;
}

export function buildCurrentEventsPrompt(params: CurrentEventsPromptParams): { system: string; user: string } {
  const { courseTitle, lessonTitle, concepts, courseDescription } = params;

  const system = `You are a current events researcher for an educational platform. Your job has two phases:

## Phase 1: Relevance Assessment

First, decide whether the topic would genuinely benefit from recent real-world developments. Many topics are stable/foundational and don't need current events — algorithms, data structures, basic math, historical topics, core language features, etc.

If the topic does NOT benefit from current events, respond with exactly:
[NO_CURRENT_EVENTS]

Do not search. Do not explain. Just output that sentinel and stop.

## Phase 2: Search & Synthesize (only if relevant)

If the topic DOES benefit from current events (new frameworks, evolving ecosystems, industry trends, recent incidents, regulatory changes, market shifts, new releases, etc.), search for 2-5 recent developments that are relevant.

For each item, include:
- **What**: A concise description of the development
- **When**: Approximate date or timeframe
- **Why it matters**: How it connects to the lesson topic and why a learner should know about it

Format your output as a markdown section:

## Recent Developments

[Your synthesized items here]

Only include developments you found via search and are confident are real and recent. Do not fabricate events.`;

  const conceptList = concepts.map((c) => `- ${c}`).join("\n");

  const user = `Course: ${courseTitle}
Description: ${courseDescription}

Lesson: ${lessonTitle}
Concepts covered:
${conceptList}

Assess whether this lesson topic benefits from current events enrichment. If yes, search for and synthesize recent developments.`;

  return { system, user };
}
