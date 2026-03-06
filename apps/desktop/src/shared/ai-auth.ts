export type AiAuthProviderId = 'claude' | 'codex' | 'custom'

export type AiAuthSessionState = 'idle' | 'running' | 'success' | 'error' | 'cancelled'

export type ClaudeConnectionMode = 'oauth' | 'api_key'
export type CodexConnectionMode = 'chatgpt' | 'api_key'

export type ClaudeAuthState = {
  connected: boolean
  mode: ClaudeConnectionMode | null
  connectedAt: string | null
  cliInstalled: boolean
  hasSystemToken: boolean
  hasExistingCliConfig: boolean
  baseUrl: string | null
}

export type CodexAuthState = {
  connected: boolean
  mode: CodexConnectionMode | null
  connectedAt: string | null
  cliInstalled: boolean
  rawStatus: string | null
}

export type CustomAuthState = {
  connected: boolean
  connectedAt: string | null
  name: string | null
  baseUrl: string | null
  model: string | null
}

export type AiAuthState = {
  claude: ClaudeAuthState
  codex: CodexAuthState
  custom: CustomAuthState
}

export type CodexLoginSession = {
  sessionId: string
  state: AiAuthSessionState
  output: string
  url: string | null
  error: string | null
}

export type ClaudeLoginSession = {
  sessionId: string
  state: AiAuthSessionState
  output: string
  error: string | null
}

export type CustomAuthConfigInput = {
  name?: string
  baseUrl: string
  model: string
  apiKey: string
}

export interface AiAuthBridge {
  getState(): Promise<AiAuthState>
  openUrl(url: string): Promise<void>
  claude: {
    saveApiKey(apiKey: string): Promise<void>
    startLogin(): Promise<ClaudeLoginSession>
    getLoginSession(sessionId: string): Promise<ClaudeLoginSession>
    cancelLogin(sessionId: string): Promise<void>
    importSystemToken(): Promise<void>
    disconnect(): Promise<void>
  }
  codex: {
    saveApiKey(apiKey: string): Promise<void>
    startLogin(): Promise<CodexLoginSession>
    getLoginSession(sessionId: string): Promise<CodexLoginSession>
    cancelLogin(sessionId: string): Promise<void>
    disconnect(): Promise<void>
  }
  custom: {
    save(input: CustomAuthConfigInput): Promise<void>
    clear(): Promise<void>
  }
}
