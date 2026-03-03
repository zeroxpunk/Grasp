import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ImageModel, LanguageModel } from "ai";

export type ModelRole = "primary" | "research" | "fast";

const DEFAULT_MODELS: Record<ModelRole, string> = {
  primary: "claude-opus-4-6",
  research: "claude-sonnet-4-6",
  fast: "gemini-2.0-flash",
};

export interface RegistryConfig {
  anthropicApiKey: string;
  googleApiKey?: string;
  models?: Partial<Record<ModelRole, string>>;
}

type AnthropicProvider = ReturnType<typeof createAnthropic>;
type GoogleProvider = ReturnType<typeof createGoogleGenerativeAI>;
type WebSearchTool = ReturnType<AnthropicProvider["tools"]["webSearch_20250305"]>;

export interface ModelRegistry {
  resolve(role: ModelRole): LanguageModel;
  imageModel(modelId: string): ImageModel;
  webSearchTool(): WebSearchTool;
}

export function createModelRegistry(config: RegistryConfig): ModelRegistry {
  const modelIds = { ...DEFAULT_MODELS, ...config.models };

  let _anthropic: AnthropicProvider | null = null;
  let _google: GoogleProvider | null = null;

  function getAnthropic() {
    if (!_anthropic) {
      _anthropic = createAnthropic({ apiKey: config.anthropicApiKey });
    }
    return _anthropic;
  }

  function getGoogle() {
    if (!_google) {
      if (!config.googleApiKey) {
        throw new Error("Google API key required for 'fast' model role");
      }
      _google = createGoogleGenerativeAI({ apiKey: config.googleApiKey });
    }
    return _google;
  }

  return {
    resolve(role: ModelRole): LanguageModel {
      const id = modelIds[role];
      if (role === "fast" && id.startsWith("gemini")) {
        return getGoogle()(id);
      }
      return getAnthropic()(id);
    },

    imageModel(modelId: string): ImageModel {
      return getGoogle().image(modelId);
    },

    webSearchTool() {
      return getAnthropic().tools.webSearch_20250305();
    },
  };
}
