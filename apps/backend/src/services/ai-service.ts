import { createAI, type GraspAI } from '@grasp/ai'

let ai: GraspAI | null = null

export function getAI() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required')
  }

  if (!ai) {
    ai = createAI({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      googleApiKey: process.env.GOOGLE_AI_API_KEY,
    })
  }

  return ai
}
