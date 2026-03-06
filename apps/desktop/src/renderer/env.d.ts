import type {
  AiAuthBridge,
} from '../shared/ai-auth'

interface AiBridge {
  createCourse(params: { description: string; context?: string }): Promise<{ slug: string }>
  generateLesson(params: { courseSlug: string; lessonNumber: number }): Promise<{ lessonNumber: number; exerciseCount: number }>
  regenerateExercises(params: { courseSlug: string; lessonNumber: number }): Promise<{ lessonNumber: number; exerciseCount: number }>
  onProgress(callback: (step: string) => void): () => void
}

interface ElectronAPI {
  aiAuth: AiAuthBridge
  ai: AiBridge
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
