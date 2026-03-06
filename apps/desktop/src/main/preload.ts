import { contextBridge, ipcRenderer } from 'electron'
import type {
  AiAuthBridge,
  ClaudeLoginSession,
  CodexLoginSession,
  CustomAuthConfigInput,
  AiAuthState,
} from '../shared/ai-auth'

const aiAuth: AiAuthBridge = {
  getState: () => ipcRenderer.invoke('ai-auth:get-state') as Promise<AiAuthState>,
  openUrl: (url: string) => ipcRenderer.invoke('ai-auth:open-url', url) as Promise<void>,
  claude: {
    saveApiKey: (apiKey: string) => ipcRenderer.invoke('ai-auth:claude:save-api-key', apiKey) as Promise<void>,
    startLogin: () => ipcRenderer.invoke('ai-auth:claude:start-login') as Promise<ClaudeLoginSession>,
    getLoginSession: (sessionId: string) =>
      ipcRenderer.invoke('ai-auth:claude:get-login-session', sessionId) as Promise<ClaudeLoginSession>,
    cancelLogin: (sessionId: string) =>
      ipcRenderer.invoke('ai-auth:claude:cancel-login', sessionId) as Promise<void>,
    importSystemToken: () => ipcRenderer.invoke('ai-auth:claude:import-system-token') as Promise<void>,
    disconnect: () => ipcRenderer.invoke('ai-auth:claude:disconnect') as Promise<void>,
  },
  codex: {
    saveApiKey: (apiKey: string) => ipcRenderer.invoke('ai-auth:codex:save-api-key', apiKey) as Promise<void>,
    startLogin: () => ipcRenderer.invoke('ai-auth:codex:start-login') as Promise<CodexLoginSession>,
    getLoginSession: (sessionId: string) =>
      ipcRenderer.invoke('ai-auth:codex:get-login-session', sessionId) as Promise<CodexLoginSession>,
    cancelLogin: (sessionId: string) =>
      ipcRenderer.invoke('ai-auth:codex:cancel-login', sessionId) as Promise<void>,
    disconnect: () => ipcRenderer.invoke('ai-auth:codex:disconnect') as Promise<void>,
  },
  custom: {
    save: (input: CustomAuthConfigInput) =>
      ipcRenderer.invoke('ai-auth:custom:save', input) as Promise<void>,
    clear: () => ipcRenderer.invoke('ai-auth:custom:clear') as Promise<void>,
  },
}

const ai = {
  createCourse: (params: { description: string; context?: string }) =>
    ipcRenderer.invoke('ai:create-course', params) as Promise<{ slug: string }>,
  generateLesson: (params: { courseSlug: string; lessonNumber: number }) =>
    ipcRenderer.invoke('ai:generate-lesson', params) as Promise<{ lessonNumber: number; exerciseCount: number }>,
  regenerateExercises: (params: { courseSlug: string; lessonNumber: number }) =>
    ipcRenderer.invoke('ai:regenerate-exercises', params) as Promise<{ lessonNumber: number; exerciseCount: number }>,
  onProgress: (callback: (step: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, step: string) => callback(step)
    ipcRenderer.on('ai:progress', handler)
    return () => { ipcRenderer.removeListener('ai:progress', handler) }
  },
}

contextBridge.exposeInMainWorld('electronAPI', {
  aiAuth,
  ai,
})
