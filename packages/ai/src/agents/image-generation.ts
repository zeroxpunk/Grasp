import { generateImage } from "ai";
import type { ModelRegistry } from "../registry.js";
import {
  DEFAULT_DIAGRAM_IMAGE_ASPECT_RATIO,
  DEFAULT_DIAGRAM_IMAGE_MEDIA_TYPE,
  DEFAULT_DIAGRAM_IMAGE_MODEL,
  buildDiagramImagePrompt,
  type DiagramImagePromptParams,
} from "../prompts/images.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("image-generation");

export interface ImageGenerationParams extends DiagramImagePromptParams {
  aspectRatio?: `${number}:${number}`;
  modelId?: string;
}

export interface GeneratedImage {
  bytes: Uint8Array;
  mediaType: string;
  alt: string;
}

export async function execute(
  registry: ModelRegistry,
  params: ImageGenerationParams,
): Promise<GeneratedImage | null> {
  try {
    const result = await generateImage({
      model: registry.imageModel(params.modelId ?? DEFAULT_DIAGRAM_IMAGE_MODEL),
      prompt: buildDiagramImagePrompt(params),
      n: 1,
      aspectRatio: params.aspectRatio ?? DEFAULT_DIAGRAM_IMAGE_ASPECT_RATIO,
    });

    const image = result.images[0];
    if (!image) return null;

    return {
      bytes: image.uint8Array,
      mediaType: DEFAULT_DIAGRAM_IMAGE_MEDIA_TYPE,
      alt: params.description,
    };
  } catch (err) {
    log.error("generate failed", err);
    return null;
  }
}
