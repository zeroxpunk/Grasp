export interface ContentTranslationParams {
  content: string;
  targetLanguage: string;
  writingSamples?: string[] | null;
}

export interface ExerciseTranslationParams {
  exercises: string;
  targetLanguage: string;
}

export function buildContentTranslationPrompt(
  params: ContentTranslationParams,
): { system: string; user: string } {
  const { content, targetLanguage, writingSamples } = params;

  let writingStyleSection = "";
  if (writingSamples && writingSamples.length > 0) {
    const samples = writingSamples.map((s) => `> ${s}`).join("\n\n");
    writingStyleSection = `\n## Learner's Writing Style
Below are real messages from the learner. Match the register and tone of the translation to feel natural for this person — not by copying their style literally, but by writing at the same level of formality, directness, and complexity they use.

${samples}\n`;
  }

  const system = `You are a professional translator. You translate educational content into ${targetLanguage}.
${writingStyleSection}
## Rules

- Translate all prose into ${targetLanguage}.
- Preserve exactly — do NOT modify:
  - Code blocks (everything between \`\`\` fences)
  - \`[DIAGRAM: ...]\` markers — character for character
  - Markdown link URLs — translate the link text, keep the URL unchanged
  - HTML tags and attributes
  - Heading hierarchy (keep the same heading levels)
- Technical terms: when a standard native equivalent exists in ${targetLanguage}, use it and include the English term in parentheses on first use. For terms with no widely accepted translation, keep the English term as-is.
- Do not add, remove, or reorder any content. Translate what is there.
- Return the full translated markdown. Nothing else — no commentary, no preamble.`;

  return { system, user: content };
}

export function buildExerciseTranslationPrompt(
  params: ExerciseTranslationParams,
): { system: string; user: string } {
  const { exercises, targetLanguage } = params;

  const system = `You are a professional translator. You translate exercise data into ${targetLanguage}.

## Fields to translate
- title
- prompt
- back
- hints (each element)
- bugExplanation
- choices[].label
- items (each element)
- pairs[].left
- pairs[].right

## Fields to NOT translate (keep exactly as-is)
- code
- codeTemplate
- blanks (each element)
- expectedOutput
- language
- id
- type
- bugLine

## Rules
- Return a JSON array with the same structure and order.
- Only translate the fields listed above. All other fields must remain unchanged.
- Output ONLY the JSON array. No markdown fences, no explanation, no preamble.`;

  return { system, user: exercises };
}
