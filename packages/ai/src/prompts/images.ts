export const DEFAULT_DIAGRAM_IMAGE_MODEL = "gemini-3-pro-image-preview";
export const DEFAULT_DIAGRAM_IMAGE_ASPECT_RATIO = "16:9" as const;
export const DEFAULT_DIAGRAM_IMAGE_MEDIA_TYPE = "image/png" as const;

export const DIAGRAM_IMAGE_STYLE = "Clean, minimal technical diagram on a pure white background. Sans-serif font. Flat design, no gradients or shadows. Thin lines (1-2px), muted colors (grays, soft blues, subtle accents). Generous whitespace. Crisp readable labels. Apple documentation style.";

export interface DiagramImagePromptParams {
  description: string;
}

export function buildDiagramImagePrompt(params: DiagramImagePromptParams): string {
  return `${DIAGRAM_IMAGE_STYLE}\n\n${params.description}`;
}
