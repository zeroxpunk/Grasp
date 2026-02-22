import type { Exercise } from "./types";

/**
 * Normalizes a flat AI-generated exercise object into a properly typed Exercise.
 * Strips irrelevant fields per type and defaults `type` to "text" for backward compat.
 */
export function normalizeExercise(raw: Record<string, unknown>): Exercise {
  const type = (raw.type as string) || "text";
  const base = {
    id: raw.id as number,
    title: raw.title as string,
    prompt: raw.prompt as string,
  };

  switch (type) {
    case "quiz":
      return {
        ...base,
        type: "quiz",
        choices: raw.choices as { label: string; correct: boolean }[],
        ...(raw.hints ? { hints: raw.hints as string[] } : {}),
      };
    case "flashcard":
      return { ...base, type: "flashcard", back: raw.back as string };
    case "ordering":
      return { ...base, type: "ordering", items: raw.items as string[] };
    case "matching":
      return {
        ...base,
        type: "matching",
        pairs: raw.pairs as { left: string; right: string }[],
      };
    case "code-completion":
      return {
        ...base,
        type: "code-completion",
        codeTemplate: raw.codeTemplate as string,
        blanks: raw.blanks as string[],
        language: (raw.language as string) || "rust",
      };
    case "bug-hunt":
      return {
        ...base,
        type: "bug-hunt",
        code: raw.code as string,
        language: (raw.language as string) || "rust",
        bugLine: raw.bugLine as number,
        bugExplanation: raw.bugExplanation as string,
      };
    case "output-prediction":
      return {
        ...base,
        type: "output-prediction",
        code: raw.code as string,
        language: (raw.language as string) || "rust",
        expectedOutput: raw.expectedOutput as string,
      };
    case "tradeoff-analysis":
      return {
        ...base,
        type: "tradeoff-analysis",
        ...(raw.code ? { code: raw.code as string } : {}),
        ...(raw.language ? { language: raw.language as string } : {}),
        ...(raw.hints ? { hints: raw.hints as string[] } : {}),
      };
    case "text":
    default:
      return {
        ...base,
        type: "text",
        ...(raw.code ? { code: raw.code as string } : {}),
        ...(raw.language ? { language: raw.language as string } : {}),
        ...(raw.hints ? { hints: raw.hints as string[] } : {}),
      };
  }
}

/**
 * Normalizes an array of flat exercise objects into typed Exercise[].
 * Auto-assigns sequential IDs if missing, and derives titles from prompts if needed.
 */
export function normalizeExercises(raw: Record<string, unknown>[]): Exercise[] {
  return raw.map((item, index) => {
    // Auto-assign id if missing
    if (item.id === undefined || item.id === null) {
      item.id = index + 1;
    }
    // Derive title from prompt if missing
    if (!item.title && item.prompt) {
      const prompt = item.prompt as string;
      item.title = prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt;
    }
    return normalizeExercise(item);
  });
}
