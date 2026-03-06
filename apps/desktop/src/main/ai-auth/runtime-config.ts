import type { StoredAiAuthConfig } from './store'

type DesktopModelRole = 'primary' | 'research' | 'fast'

export type DesktopTextProviderConfig =
  | {
      kind: 'anthropic'
      apiKey?: string
      authToken?: string
    }
  | {
      kind: 'openai'
      apiKey: string
      baseUrl?: string
    }
  | {
      kind: 'custom'
      apiKey: string
      baseUrl: string
      model: string
    }

export type DesktopAiRuntimeConfig = {
  textProvider: DesktopTextProviderConfig
  models?: Partial<Record<DesktopModelRole, string>>
}

type DesktopEnv = NodeJS.ProcessEnv

export function resolveDesktopAiRuntimeConfig(
  config: StoredAiAuthConfig,
  env: DesktopEnv = process.env,
): DesktopAiRuntimeConfig {
  const modelOverrides = readModelOverrides(env)

  if (config.custom) {
    return {
      textProvider: {
        kind: 'custom',
        apiKey: config.custom.apiKey,
        baseUrl: config.custom.baseUrl,
        model: config.custom.model,
      },

      models: {
        primary: config.custom.model,
        research: config.custom.model,
        fast: config.custom.model,
      },
    }
  }

  if (config.claude?.mode === 'api_key' && config.claude.apiKey) {
    return {
      textProvider: {
        kind: 'anthropic',
        apiKey: config.claude.apiKey,
      },

      ...(hasModelOverrides(modelOverrides) ? { models: modelOverrides } : {}),
    }
  }

  if (config.codex?.mode === 'api_key' && config.codex.apiKey) {
    return {
      textProvider: {
        kind: 'openai',
        apiKey: config.codex.apiKey,
      },

      ...(hasModelOverrides(modelOverrides) ? { models: modelOverrides } : {}),
    }
  }

  const envFallback = resolveEnvFallback(env)
  if (envFallback) {
    return envFallback
  }

  if (config.claude?.mode === 'oauth' && config.claude.oauthToken) {
    return {
      textProvider: {
        kind: 'anthropic',
        authToken: config.claude.oauthToken,
      },

      ...(hasModelOverrides(modelOverrides) ? { models: modelOverrides } : {}),
    }
  }

  if (config.codex?.mode === 'chatgpt') {
    throw new Error(
      'Codex ChatGPT login cannot be used for SDK-backed AI calls. Connect an OpenAI API key or use environment-based AI config instead.',
    )
  }

  throw new Error(
    'No API-backed AI provider is configured. Connect an Anthropic API key, an OpenAI API key, a custom provider, or set backend AI environment variables.',
  )
}

function resolveEnvFallback(env: DesktopEnv): DesktopAiRuntimeConfig | null {
  const anthropicApiKey = readEnvValue(env, 'ANTHROPIC_API_KEY')
  if (anthropicApiKey) {
    return {
      textProvider: {
        kind: 'anthropic',
        apiKey: anthropicApiKey,
      },
      models: readOptionalModelOverrides(env),
    }
  }

  const openaiApiKey = readEnvValue(env, 'OPENAI_API_KEY')
  if (openaiApiKey) {
    const openaiBaseUrl = readEnvValue(env, 'OPENAI_BASE_URL')
    return {
      textProvider: {
        kind: 'openai',
        apiKey: openaiApiKey,
        ...(openaiBaseUrl ? { baseUrl: openaiBaseUrl } : {}),
      },
      models: readOptionalModelOverrides(env),
    }
  }
  return null
}

function readOptionalModelOverrides(env: DesktopEnv) {
  const models = readModelOverrides(env)
  return hasModelOverrides(models) ? models : undefined
}

function readModelOverrides(env: DesktopEnv): Partial<Record<DesktopModelRole, string>> {
  return {
    primary: readEnvValue(env, 'AI_PRIMARY_MODEL'),
    research: readEnvValue(env, 'AI_RESEARCH_MODEL'),
    fast: readEnvValue(env, 'AI_FAST_MODEL'),
  }
}

function hasModelOverrides(models: Partial<Record<DesktopModelRole, string>>) {
  return Boolean(models.primary || models.research || models.fast)
}

function readEnvValue(env: DesktopEnv, key: string) {
  const value = env[key]?.trim()
  return value ? value : undefined
}
