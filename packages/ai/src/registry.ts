import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway, type ImageModel, type LanguageModel } from "ai";

import { lazy } from "./shared/utils.js";

export type ModelRole = "primary" | "research" | "fast";
export type TextProviderKind = "anthropic" | "openai";

export type AnthropicTextProviderConfig = {
  kind: "anthropic";
  apiKey?: string;
  authToken?: string;
};

export type OpenAITextProviderConfig = {
  kind: "openai";
  apiKey: string;
  baseUrl?: string;
};

export type TextProviderConfig =
  | AnthropicTextProviderConfig
  | OpenAITextProviderConfig;

export interface RegistryConfig {
  textProvider: TextProviderConfig;
  googleApiKey?: string;
  gatewayApiKey?: string;
  models?: Partial<Record<ModelRole, string>>;
}

type LanguageProviderKind = TextProviderKind | "google";

const GATEWAY_PROVIDER_PREFIX: Record<LanguageProviderKind, string> = {
  anthropic: "anthropic",
  openai: "openai",
  google: "google",
};

type GatewayInstance = ReturnType<typeof createGateway>;
type WebSearchTool = ReturnType<GatewayInstance["tools"]["perplexitySearch"]>;
export interface WebSearchToolConfig {
  maxResults?: number;
  maxTokensPerPage?: number;
  maxTokens?: number;
  country?: string;
  searchDomainFilter?: string[];
  searchLanguageFilter?: string[];
  searchRecencyFilter?: "day" | "week" | "month" | "year";
}

export interface ModelRegistry {
  resolve(role: ModelRole): LanguageModel;
  imageModel(modelId: string): ImageModel;
  webSearchTool(config?: WebSearchToolConfig): WebSearchTool;
  defaultModels(): Record<ModelRole, string>;
}

const DEFAULT_MODELS: Record<TextProviderKind, Record<ModelRole, string>> = {
  anthropic: {
    primary: "claude-opus-4.6",
    research: "claude-sonnet-4.6",
    fast: "claude-haiku-4.5",
  },
  openai: {
    primary: "gpt-5.4",
    research: "gpt-5.2",
    fast: "gpt-5-mini",
  },
};

const MODEL_PREFIXES: [prefix: string, provider: LanguageProviderKind][] = [
  ["gemini", "google"],
  ["claude", "anthropic"],
  ["gpt", "openai"],
  ["o1", "openai"],
  ["o3", "openai"],
  ["o4", "openai"],
  ["computer-use", "openai"],
  ["codex", "openai"],
];

export function createModelRegistry(config: RegistryConfig): ModelRegistry {
  const modelIds = resolveModelIds(config);

  const getGateway = lazy(() =>
    createGateway({ apiKey: config.gatewayApiKey }),
  );

  const getAnthropic = lazy(() => {
    if (config.textProvider.kind !== "anthropic") {
      throw new Error("Anthropic model requested but no Anthropic API key configured");
    }
    const { authToken, apiKey } = config.textProvider;
    return createAnthropic(authToken ? { authToken } : { apiKey: apiKey! });
  });

  const getGoogle = lazy(() => {
    if (!config.googleApiKey) {
      throw new Error("Google API key required");
    }
    return createGoogleGenerativeAI({ apiKey: config.googleApiKey });
  });

  const getOpenAI = lazy(() => {
    if (config.textProvider.kind !== "openai") {
      throw new Error("OpenAI model requested but no OpenAI API key configured");
    }
    return createOpenAI({
      apiKey: config.textProvider.apiKey,
      ...(config.textProvider.baseUrl ? { baseURL: config.textProvider.baseUrl } : {}),
    });
  });

  function detectProvider(modelId: string): LanguageProviderKind {
    return MODEL_PREFIXES.find(([p]) => modelId.startsWith(p))?.[1] ?? config.textProvider.kind;
  }

  function toGatewayId(modelId: string): string {
    if (modelId.includes("/")) return modelId;
    return `${GATEWAY_PROVIDER_PREFIX[detectProvider(modelId)]}/${modelId}`;
  }

  return {
    resolve(role) {
      const id = modelIds[role];

      if (config.gatewayApiKey) {
        return getGateway()(toGatewayId(id));
      }

      switch (detectProvider(id)) {
        case "anthropic": return getAnthropic()(id);
        case "google":    return getGoogle()(id);
        case "openai":    return getOpenAI()(id);
      }
    },

    imageModel(modelId) {
      return getGoogle().image(modelId);
    },

    webSearchTool(config) {
      return getGateway().tools.perplexitySearch(config);
    },

    defaultModels() {
      return { ...modelIds };
    },
  };
}

function resolveModelIds(config: RegistryConfig): Record<ModelRole, string> {
  return { ...DEFAULT_MODELS[config.textProvider.kind], ...config.models };
}
