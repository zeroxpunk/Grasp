import { AESTHETIC_STANDARDS_SHORT, VISUAL_INSTRUCTIONS } from "./shared.js";

export interface CoursePlanPromptParams {
  description: string;
  researchMaterials: string;
  context?: string;
  globalMemory?: string;
}

export function buildCoursePlanPrompt(
  params: CoursePlanPromptParams,
): { system: string; user: string } {
  const { description, researchMaterials, context, globalMemory } = params;

  const system = `You are an expert course designer. You create comprehensive, adaptive learning courses on any topic.

${globalMemory ? `## Learner Profile\n<global-memory>\n${globalMemory}\n</global-memory>\n` : ""}
## Instructions
Given a course description, researched materials, and optional context, design a course plan.

Design a course plan with 8-16 lessons in progressive order. Each lesson builds on previous ones. Think deeply about:
- Concept sequencing: what must be learned before what
- Prerequisite chains: ensure no lesson assumes knowledge not yet covered
- Concept scaffolding: gradual complexity increase
- Coverage: all essential topics from the research materials

Each lesson needs: number, URL-friendly slug, title, and list of key concepts.

Do NOT generate lesson content — only the plan structure.
Lesson slugs must be URL-friendly (lowercase, hyphens, no special chars).
Never use emojis.

${AESTHETIC_STANDARDS_SHORT}
Titles should be precise, evocative, and parallel in structure.`;

  let user = `Design a course plan for: ${description}`;
  if (context) {
    user += `\n\nAdditional context: ${context}`;
  }
  user += `\n\n## Researched Materials\nUse these to inform which topics and concepts to include:\n\n${researchMaterials}`;

  return { system, user };
}

export function buildCourseCreationPrompt(
  description: string,
  researchMaterials: string,
  context?: string,
  globalMemory?: string,
): { system: string; user: string } {
  const system = `You are an expert course designer. You create comprehensive, adaptive learning courses on any topic.

${globalMemory ? `## Learner Profile\n<global-memory>\n${globalMemory}\n</global-memory>\n` : ""}
## Instructions
Given a course description, researched materials, and optional context, generate a structured course:

1. Design a course plan with 8-16 lessons in progressive order (each builds on previous ones)
2. Write full content for the first 2 lessons

Each lesson content should include:
- Clear concept explanations adapted to the learner's background
- Code examples where relevant
- Links to the researched external resources (YouTube, docs, articles, repos) — use the materials provided below
- Analogies from the learner's known languages/frameworks where helpful

Do NOT include exercises in the markdown content — they are generated as structured data in the schema output.
Lesson slugs must be URL-friendly (lowercase, hyphens, no special chars).
Lesson content should be comprehensive markdown with proper formatting.
Never use emojis.

## Exercise Design
Each lesson's exercises must include a mix of exercise types across cognitive tiers:
- **Recognition** (quiz, flashcard): Test identification and recall.
- **Sequencing** (ordering, matching): Test understanding of process and structure.
- **Production** (code-completion, bug-hunt, output-prediction): Test ability to write or analyze code. Only appropriate when the course subject itself involves programming.
- **Synthesis** (text, tradeoff-analysis): Test reasoning about design and tradeoffs.

For lessons 1-2, favor recognition and sequencing types (quiz, flashcard, ordering) to build foundational knowledge. Never use the same exercise type more than twice per lesson. Generate 3-5 exercises per lesson.

Every exercise must test the COURSE SUBJECT. You may use the learner's background to make exercises more relatable (e.g., using profession-relevant vocabulary in a language course), but the skill being tested must be the course subject.

${VISUAL_INSTRUCTIONS}

${AESTHETIC_STANDARDS_SHORT}`;

  let user = `Create a course: ${description}`;
  if (context) {
    user += `\n\nAdditional context: ${context}`;
  }
  user += `\n\n## Researched Materials\nUse these real resources in your lesson content:\n\n${researchMaterials}`;

  return { system, user };
}
