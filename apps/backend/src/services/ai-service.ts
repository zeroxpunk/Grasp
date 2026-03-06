import { createAI, type GraspAI, type RegistryConfig } from '@grasp/ai'
import { resolveBackendAiConfig } from '../utils/ai-config.js'

let ai: GraspAI | null = null
let aiConfigKey: string | null = null

export function getAI(config: RegistryConfig = resolveBackendAiConfig()) {
  const nextKey = JSON.stringify(config)

  if (!ai || aiConfigKey !== nextKey) {
    ai = createAI(config)
    aiConfigKey = nextKey
  }

  return ai
}
