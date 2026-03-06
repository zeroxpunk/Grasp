import type {
  AiAuthBridge,
  AiAuthState,
  ClaudeLoginSession,
  CodexLoginSession,
  CustomAuthConfigInput,
} from '../../shared/ai-auth'

export interface AiAuthRepository {
  getState(): Promise<AiAuthState>
  openUrl(url: string): Promise<void>
  saveClaudeApiKey(apiKey: string): Promise<void>
  startClaudeLogin(): Promise<ClaudeLoginSession>
  getClaudeLoginSession(sessionId: string): Promise<ClaudeLoginSession>
  cancelClaudeLogin(sessionId: string): Promise<void>
  importClaudeSystemToken(): Promise<void>
  disconnectClaude(): Promise<void>
  saveCodexApiKey(apiKey: string): Promise<void>
  startCodexLogin(): Promise<CodexLoginSession>
  getCodexLoginSession(sessionId: string): Promise<CodexLoginSession>
  cancelCodexLogin(sessionId: string): Promise<void>
  disconnectCodex(): Promise<void>
  saveCustomProvider(input: CustomAuthConfigInput): Promise<void>
  clearCustomProvider(): Promise<void>
}

export class ElectronAiAuthRepository implements AiAuthRepository {
  private bridge: AiAuthBridge

  constructor(bridge: AiAuthBridge = window.electronAPI.aiAuth) {
    this.bridge = bridge
  }

  getState() {
    return this.bridge.getState()
  }

  openUrl(url: string) {
    return this.bridge.openUrl(url)
  }

  saveClaudeApiKey(apiKey: string) {
    return this.bridge.claude.saveApiKey(apiKey)
  }

  startClaudeLogin() {
    return this.bridge.claude.startLogin()
  }

  getClaudeLoginSession(sessionId: string) {
    return this.bridge.claude.getLoginSession(sessionId)
  }

  cancelClaudeLogin(sessionId: string) {
    return this.bridge.claude.cancelLogin(sessionId)
  }

  importClaudeSystemToken() {
    return this.bridge.claude.importSystemToken()
  }

  disconnectClaude() {
    return this.bridge.claude.disconnect()
  }

  saveCodexApiKey(apiKey: string) {
    return this.bridge.codex.saveApiKey(apiKey)
  }

  startCodexLogin() {
    return this.bridge.codex.startLogin()
  }

  getCodexLoginSession(sessionId: string) {
    return this.bridge.codex.getLoginSession(sessionId)
  }

  cancelCodexLogin(sessionId: string) {
    return this.bridge.codex.cancelLogin(sessionId)
  }

  disconnectCodex() {
    return this.bridge.codex.disconnect()
  }

  saveCustomProvider(input: CustomAuthConfigInput) {
    return this.bridge.custom.save(input)
  }

  clearCustomProvider() {
    return this.bridge.custom.clear()
  }
}
