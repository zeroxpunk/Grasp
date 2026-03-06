import { ipcMain, shell } from 'electron'
import type { CustomAuthConfigInput } from '../../shared/ai-auth'
import type { AiAuthService } from './service'

export function registerAiAuthIpc(service: AiAuthService) {
  ipcMain.handle('ai-auth:get-state', () => service.getState())
  ipcMain.handle('ai-auth:open-url', (_event, url: string) => shell.openExternal(url))

  ipcMain.handle('ai-auth:claude:save-api-key', (_event, apiKey: string) =>
    service.saveClaudeApiKey(apiKey))
  ipcMain.handle('ai-auth:claude:start-login', () => service.startClaudeLogin())
  ipcMain.handle('ai-auth:claude:get-login-session', (_event, sessionId: string) =>
    service.getClaudeLoginSession(sessionId))
  ipcMain.handle('ai-auth:claude:cancel-login', (_event, sessionId: string) =>
    service.cancelClaudeLogin(sessionId))
  ipcMain.handle('ai-auth:claude:import-system-token', () =>
    service.importClaudeSystemToken())
  ipcMain.handle('ai-auth:claude:disconnect', () => service.disconnectClaude())

  ipcMain.handle('ai-auth:codex:save-api-key', (_event, apiKey: string) =>
    service.saveCodexApiKey(apiKey))
  ipcMain.handle('ai-auth:codex:start-login', () => service.startCodexLogin())
  ipcMain.handle('ai-auth:codex:get-login-session', (_event, sessionId: string) =>
    service.getCodexLoginSession(sessionId))
  ipcMain.handle('ai-auth:codex:cancel-login', (_event, sessionId: string) =>
    service.cancelCodexLogin(sessionId))
  ipcMain.handle('ai-auth:codex:disconnect', () => service.disconnectCodex())

  ipcMain.handle('ai-auth:custom:save', (_event, input: CustomAuthConfigInput) =>
    service.saveCustomProvider(input))
  ipcMain.handle('ai-auth:custom:clear', () => service.clearCustomProvider())
}
