import type { ModelRole, RegistryConfig, TextProviderConfig, TextProviderKind } from '@grasp/ai'
type BackendEnv = NodeJS.ProcessEnv

const TEXT_PROVIDER_ORDER: TextProviderKind[] = ['anthropic', 'openai']

export function resolveBackendAiConfig(env: BackendEnv = process.env): RegistryConfig {
  const models = readModelOverrides(env)

  return {
    textProvider: resolveTextProvider(env),
    googleApiKey: readEnvValue(env, 'GOOGLE_AI_API_KEY'),
    ...(hasModelOverrides(models) ? { models } : {}),
  }
}

function resolveTextProvider(env: BackendEnv): TextProviderConfig {
  const preferredProvider = readPreferredProvider(env)
  const providerOrder = preferredProvider
    ? [preferredProvider, ...TEXT_PROVIDER_ORDER.filter((provider) => provider !== preferredProvider)]
    : TEXT_PROVIDER_ORDER

  for (const provider of providerOrder) {
    const resolved = resolveProviderConfig(provider, env)
    if (resolved) {
      return resolved
    }
  }

  throw new Error(
    [
      'No text AI provider is configured.',
      'Set ANTHROPIC_API_KEY or OPENAI_API_KEY.',
      'Use AI_TEXT_PROVIDER to force anthropic or openai when multiple are present.',
    ].join(' '),
  )
}

function resolveProviderConfig(
  provider: TextProviderKind,
  env: BackendEnv,
): TextProviderConfig | null {
  switch (provider) {
    case 'anthropic': {
      const key = readEnvValue(env, 'ANTHROPIC_API_KEY')
      if (!key) return null
      const isOAuthToken = key.startsWith('sk-ant-oat')
      return isOAuthToken
        ? { kind: 'anthropic', authToken: key }
        : { kind: 'anthropic', apiKey: key }
    }
    case 'openai': {
      const apiKey = readEnvValue(env, 'OPENAI_API_KEY')
      if (!apiKey) {
        return null
      }

      const baseUrl = readEnvValue(env, 'OPENAI_BASE_URL')
      return {
        kind: 'openai',
        apiKey,
        ...(baseUrl ? { baseUrl } : {}),
      }
    }
  }
}

function readPreferredProvider(env: BackendEnv): TextProviderKind | null {
  const value = readEnvValue(env, 'AI_TEXT_PROVIDER')
  if (!value) {
    return null
  }

  if (value === 'anthropic' || value === 'openai') {
    return value
  }

  throw new Error("AI_TEXT_PROVIDER must be one of: anthropic, openai")
}

function readModelOverrides(env: BackendEnv): Partial<Record<ModelRole, string>> {
  return {
    primary: readEnvValue(env, 'AI_PRIMARY_MODEL'),
    research: readEnvValue(env, 'AI_RESEARCH_MODEL'),
    fast: readEnvValue(env, 'AI_FAST_MODEL'),
  }
}

function hasModelOverrides(models: Partial<Record<ModelRole, string>>) {
  return Boolean(models.primary || models.research || models.fast)
}

function readEnvValue(env: BackendEnv, key: string) {
  const value = env[key]?.trim()
  return value ? value : undefined
}
