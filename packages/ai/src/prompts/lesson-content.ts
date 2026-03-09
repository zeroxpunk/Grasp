import type { CourseManifest } from "../shared/types.js";
import { AESTHETIC_STANDARDS_SHORT, VISUAL_INSTRUCTIONS } from "./shared.js";

export interface InitialLessonPromptParams {
  description: string;
  researchMaterials: string;
  context: string | null;
  globalMemory: string | null;
  coursePlan: {
    title: string;
    description: string;
    lessons: Array<{ number: number; title: string; concepts: string[] }>;
  };
  lessonNumber: number;
  lessonTitle: string;
  concepts: string[];
}

export interface OnDemandLessonPromptParams {
  manifest: CourseManifest;
  globalMemory: string | null;
  courseMemory: string | null;
  courseContext: string | null;
  lessonNumber: number;
}

export function buildInitialLessonPrompt(
  params: InitialLessonPromptParams,
): { system: string; user: string } {
  const {
    researchMaterials,
    context,
    globalMemory,
    coursePlan,
    lessonNumber,
    lessonTitle,
    concepts,
  } = params;

  const lessonPlan = coursePlan.lessons
    .map((lesson) => `  ${lesson.number}. ${lesson.title} — concepts: ${lesson.concepts.join(", ")}`)
    .join("\n");

  const system = `You are an expert lesson writer for the course "${coursePlan.title}". You generate comprehensive, beautifully crafted lesson content.

${globalMemory ? `## Learner Profile\n<global-memory>\n${globalMemory}\n</global-memory>\n` : ""}
## Course Information
**Course:** ${coursePlan.title}
**Description:** ${coursePlan.description}
${context ? `\n**Course Context:**\n${context}` : ""}

## Full Course Plan
<lesson-plan>
${lessonPlan}
</lesson-plan>

## Instructions
Generate the full content for Lesson ${lessonNumber}: "${lessonTitle}".

The lesson should:
1. Cover these concepts thoroughly: ${concepts.join(", ")}
2. Include clear concept explanations adapted to the learner's background
3. Include code examples ONLY when the topic itself is technical and code genuinely illustrates the concept. Never use code as a metaphor or analogy for non-technical ideas — use plain language, diagrams, or real-world examples instead
4. Reference real resources from the researched materials (YouTube, docs, articles, repos) — use markdown links
5. Be aware of where this lesson fits in the course arc (what comes later, what this prepares for)

Do NOT include exercises in the markdown — exercises are generated separately.
Never use emojis.

Format as markdown. Start with # heading for the lesson title.

${VISUAL_INSTRUCTIONS}

${AESTHETIC_STANDARDS_SHORT}`;

  let user = `Write Lesson ${lessonNumber}: "${lessonTitle}".\n\nConcepts to cover: ${concepts.join(", ")}`;
  user += `\n\n## Researched Materials\nReference these real resources in your lesson:\n\n${researchMaterials}`;

  return { system, user };
}

export function buildOnDemandLessonPrompt(
  params: OnDemandLessonPromptParams,
): { system: string; user: string } {
  const { manifest, globalMemory, courseMemory, courseContext, lessonNumber } = params;

  const lesson = manifest.lessons.find((entry) => entry.number === lessonNumber);
  if (!lesson) throw new Error(`Lesson ${lessonNumber} not found in ${manifest.slug}`);

  const previousLessons: string[] = [];
  for (const entry of manifest.lessons) {
    if (entry.number >= lessonNumber) break;
    if (entry.status === "completed" || entry.status === "started") {
      previousLessons.push(`### Lesson ${entry.number}: ${entry.title}\n(completed)`);
    }
  }

  const lessonPlan = manifest.lessons
    .map((entry) => `  ${entry.number}. ${entry.title} [${entry.status}] — concepts: ${entry.concepts.join(", ")}`)
    .join("\n");

  const masteryText = Object.entries(manifest.mastery)
    .map(([concept, score]) => `  ${concept}: ${score}`)
    .join("\n");

  const system = `You are an expert lesson writer for the course "${manifest.title}". You generate adaptive, comprehensive lesson content.

${globalMemory ? `## Learner Profile\n<global-memory>\n${globalMemory}\n</global-memory>\n` : ""}
## Course Information
**Course:** ${manifest.title}
**Description:** ${manifest.description}
${courseContext ? `\n**Course Context:**\n${courseContext}` : ""}

## Course Plan
<lesson-plan>
${lessonPlan}
</lesson-plan>

## Current Mastery Levels
<mastery>
${masteryText || "No mastery data yet."}
</mastery>

## Course Memory
<course-memory>
${courseMemory || "No course memory yet."}
</course-memory>

## Previous Lessons Completed
${previousLessons.length > 0 ? previousLessons.join("\n") : "None yet."}

## Instructions
Generate the full content for Lesson ${lessonNumber}: "${lesson.title}".

The lesson should:
1. Build on what the learner has already covered (see mastery levels and previous lessons)
2. Address any known gaps or weak areas from course memory insights
3. Include clear concept explanations adapted to the learner's background
4. Include code examples ONLY when the topic itself is technical and code genuinely illustrates the concept. Never use code as a metaphor or analogy for non-technical ideas — use plain language, diagrams, or real-world examples instead
5. Include external resources: YouTube video links, documentation links, articles
6. Be comprehensive but respect the learner's level — skip basics they've mastered

Do NOT include exercises in the markdown — exercises are generated separately.
Never use emojis.

Format as markdown. Start with # heading for the lesson title.

For YouTube links and external resources:
- Include real, well-known resources you're confident exist
- Format as markdown links: [Title](URL)

${VISUAL_INSTRUCTIONS}

${AESTHETIC_STANDARDS_SHORT}`;

  const user = `Generate the content for Lesson ${lessonNumber}: "${lesson.title}".

Concepts to cover: ${lesson.concepts.join(", ")}

Output the lesson content as markdown. No JSON wrapping — just the markdown content.`;

  return { system, user };
}
