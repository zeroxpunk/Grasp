import { createAI, type GraspAI, type RegistryConfig } from '@grasp/ai'
import { resolveDesktopAiRuntimeConfig, type DesktopAiRuntimeConfig } from '../ai-auth/runtime-config'
import { AiAuthStore } from '../ai-auth/store'

let cachedAI: GraspAI | null = null
let cachedConfigKey: string | null = null

function toRegistryConfig(desktop: DesktopAiRuntimeConfig): RegistryConfig {
  const { textProvider, models } = desktop

  if (textProvider.kind === 'custom') {
    return {
      textProvider: {
        kind: 'openai',
        apiKey: textProvider.apiKey,
        baseUrl: textProvider.baseUrl,
      },
      models,
    }
  }

  return { textProvider, models }
}

export function getLocalAI(): GraspAI {
  const store = new AiAuthStore()
  const desktopConfig = resolveDesktopAiRuntimeConfig(store.load())
  const config = toRegistryConfig(desktopConfig)
  const configKey = JSON.stringify(config)

  if (!cachedAI || cachedConfigKey !== configKey) {
    cachedAI = createAI(config)
    cachedConfigKey = configKey
  }

  return cachedAI
}
