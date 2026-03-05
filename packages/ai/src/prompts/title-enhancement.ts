export interface TitleEnhancementPromptParams {
  courseTitle: string;
  lessons: Array<{ number: number; title: string }>;
}

export function buildTitleEnhancementPrompt(params: TitleEnhancementPromptParams): string {
  return `Rewrite these lesson titles for a course called "${params.courseTitle}". Make them catchier and more engaging, 3-7 words each. Keep the original meaning. Return ONLY a JSON array of strings, no markdown fences.

Original titles:
${params.lessons.map((lesson) => `${lesson.number}. ${lesson.title}`).join("\n")}`;
}
