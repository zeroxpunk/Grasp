import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type {
  AiAuthState,
  ClaudeLoginSession,
  CodexLoginSession,
  CustomAuthConfigInput,
} from '../../shared/ai-auth'
import { getClaudeCliConfigStatus, getExistingClaudeToken } from './claude-system-auth'
import { getCommandEnv, isCommandAvailable, runCommand } from './command-runner'
import { resolveDesktopAiRuntimeConfig } from './runtime-config'
import { AiAuthStore, type StoredAiAuthConfig } from './store'

type InternalCodexLoginSession = CodexLoginSession & {
  process: ChildProcess | null
}

type InternalClaudeLoginSession = ClaudeLoginSession & {
  process: ChildProcess | null
}

type CodexCliState = 'connected_chatgpt' | 'connected_api_key' | 'not_logged_in' | 'unknown'

const URL_PATTERN = /https?:\/\/[^\s]+/g

function extractFirstUrl(text: string) {
  const matches = text.match(URL_PATTERN)
  return matches?.[0] || null
}

function normalizeCodexCliState(output: string): CodexCliState {
  const normalized = output.toLowerCase()
  if (normalized.includes('logged in using chatgpt')) {
    return 'connected_chatgpt'
  }

  if (normalized.includes('logged in using an api key') || normalized.includes('logged in using api key')) {
    return 'connected_api_key'
  }

  if (normalized.includes('not logged in')) {
    return 'not_logged_in'
  }

  return 'unknown'
}

function toCodexLoginSession(session: InternalCodexLoginSession): CodexLoginSession {
  return {
    sessionId: session.sessionId,
    state: session.state,
    output: session.output,
    url: session.url,
    error: session.error,
  }
}

function toClaudeLoginSession(session: InternalClaudeLoginSession): ClaudeLoginSession {
  return {
    sessionId: session.sessionId,
    state: session.state,
    output: session.output,
    error: session.error,
  }
}

export class AiAuthService {
  private store = new AiAuthStore()
  private codexSessions = new Map<string, InternalCodexLoginSession>()
  private claudeSessions = new Map<string, InternalClaudeLoginSession>()

  private loadConfig() {
    return this.store.load()
  }

  getRuntimeConfig() {
    return resolveDesktopAiRuntimeConfig(this.loadConfig())
  }

  private saveConfig(config: StoredAiAuthConfig) {
    this.store.save(config)
  }

  private updateConfig(mutator: (config: StoredAiAuthConfig) => StoredAiAuthConfig) {
    const nextConfig = mutator(this.loadConfig())
    this.saveConfig(nextConfig)
  }

  private async getCodexCliStatus() {
    try {
      const result = await runCommand('codex', ['login', 'status'])
      const output = [result.stdout, result.stderr]
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .join('\n')
        .trim()

      return {
        output,
        state: normalizeCodexCliState(output),
      }
    } catch (error) {
      return {
        output: error instanceof Error ? error.message : String(error),
        state: 'unknown' as const,
      }
    }
  }

  async getState(): Promise<AiAuthState> {
    const config = this.loadConfig()
    const [claudeCliInstalled, codexCliInstalled, codexCliStatus] = await Promise.all([
      isCommandAvailable('claude'),
      isCommandAvailable('codex'),
      this.getCodexCliStatus(),
    ])
    const claudeCliConfig = getClaudeCliConfigStatus()
    const hasSystemToken = Boolean(getExistingClaudeToken())

    const codexMode = config.codex?.mode
      ?? (codexCliStatus.state === 'connected_chatgpt'
        ? 'chatgpt'
        : codexCliStatus.state === 'connected_api_key'
          ? 'api_key'
          : null)

    return {
      claude: {
        connected: Boolean(config.claude),
        mode: config.claude?.mode ?? null,
        connectedAt: config.claude?.connectedAt ?? null,
        cliInstalled: claudeCliInstalled,
        hasSystemToken,
        hasExistingCliConfig: claudeCliConfig.hasConfig,
        baseUrl: claudeCliConfig.baseUrl,
      },
      codex: {
        connected: Boolean(config.codex) || codexCliStatus.state === 'connected_chatgpt' || codexCliStatus.state === 'connected_api_key',
        mode: codexMode,
        connectedAt: config.codex?.connectedAt ?? null,
        cliInstalled: codexCliInstalled,
        rawStatus: codexCliStatus.output || null,
      },
      custom: {
        connected: Boolean(config.custom),
        connectedAt: config.custom?.connectedAt ?? null,
        name: config.custom?.name ?? null,
        baseUrl: config.custom?.baseUrl ?? null,
        model: config.custom?.model ?? null,
      },
    }
  }

  async saveClaudeApiKey(apiKey: string) {
    this.updateConfig((config) => ({
      ...config,
      claude: {
        mode: 'api_key',
        apiKey,
        connectedAt: new Date().toISOString(),
      },
    }))
  }

  async importClaudeSystemToken() {
    const token = getExistingClaudeToken()
    if (!token) {
      throw new Error('No Claude token found in the local system store')
    }

    this.updateConfig((config) => ({
      ...config,
      claude: {
        mode: 'oauth',
        oauthToken: token,
        connectedAt: new Date().toISOString(),
      },
    }))
  }

  async disconnectClaude() {
    this.updateConfig((config) => {
      const nextConfig = { ...config }
      delete nextConfig.claude
      return nextConfig
    })
  }

  async startClaudeLogin(): Promise<ClaudeLoginSession> {
    const runningSession = [...this.claudeSessions.values()].find((session) => session.state === 'running')
    if (runningSession) {
      return toClaudeLoginSession(runningSession)
    }

    const sessionId = randomUUID()
    const child = spawn('claude', ['setup-token'], {
      env: getCommandEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      windowsHide: true,
    })

    const session: InternalClaudeLoginSession = {
      sessionId,
      state: 'running',
      output: '',
      error: null,
      process: child,
    }

    const appendOutput = (chunk: Buffer | string) => {
      const text = chunk.toString()
      session.output = `${session.output}${text}`.trim()
    }

    child.stdout.on('data', appendOutput)
    child.stderr.on('data', appendOutput)

    child.once('error', (error) => {
      session.state = 'error'
      session.error = error.message
      session.process = null
    })

    child.once('close', () => {
      session.process = null

      if (session.state === 'cancelled') {
        return
      }

      const token = getExistingClaudeToken()
      if (token) {
        this.updateConfig((config) => ({
          ...config,
          claude: {
            mode: 'oauth',
            oauthToken: token,
            connectedAt: new Date().toISOString(),
          },
        }))
        session.state = 'success'
        session.error = null
        return
      }

      session.state = 'error'
      session.error = session.output || 'Claude login did not produce a token'
    })

    this.claudeSessions.set(sessionId, session)
    return toClaudeLoginSession(session)
  }

  getClaudeLoginSession(sessionId: string) {
    const session = this.claudeSessions.get(sessionId)
    if (!session) {
      throw new Error('Claude login session not found')
    }

    return toClaudeLoginSession(session)
  }

  async cancelClaudeLogin(sessionId: string) {
    const session = this.claudeSessions.get(sessionId)
    if (!session) {
      return
    }

    session.state = 'cancelled'
    session.error = null
    if (session.process && !session.process.killed) {
      session.process.kill('SIGTERM')
    }
  }

  async saveCodexApiKey(apiKey: string) {
    this.updateConfig((config) => ({
      ...config,
      codex: {
        mode: 'api_key',
        apiKey,
        connectedAt: new Date().toISOString(),
      },
    }))
  }

  async disconnectCodex() {
    try {
      await runCommand('codex', ['logout'])
    } catch {
      // No-op. Local API key mode does not require a CLI logout.
    }

    this.updateConfig((config) => {
      const nextConfig = { ...config }
      delete nextConfig.codex
      return nextConfig
    })
  }

  async startCodexLogin(): Promise<CodexLoginSession> {
    const runningSession = [...this.codexSessions.values()].find((session) => session.state === 'running')
    if (runningSession) {
      return toCodexLoginSession(runningSession)
    }

    const sessionId = randomUUID()
    const child = spawn('codex', ['login'], {
      env: getCommandEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      windowsHide: true,
    })

    const session: InternalCodexLoginSession = {
      sessionId,
      state: 'running',
      output: '',
      url: null,
      error: null,
      process: child,
    }

    const appendOutput = (chunk: Buffer | string) => {
      const text = chunk.toString()
      session.output = `${session.output}${text}`.trim()
      session.url = session.url || extractFirstUrl(text)
    }

    child.stdout.on('data', appendOutput)
    child.stderr.on('data', appendOutput)

    child.once('error', (error) => {
      session.state = 'error'
      session.error = error.message
      session.process = null
    })

    child.once('close', async () => {
      session.process = null

      if (session.state === 'cancelled') {
        return
      }

      const status = await this.getCodexCliStatus()
      if (status.state === 'connected_chatgpt' || status.state === 'connected_api_key') {
        this.updateConfig((config) => ({
          ...config,
          codex: {
            mode: status.state === 'connected_chatgpt' ? 'chatgpt' : 'api_key',
            apiKey: config.codex?.mode === 'api_key' ? config.codex.apiKey : undefined,
            connectedAt: new Date().toISOString(),
          },
        }))
        session.state = 'success'
        session.error = null
        return
      }

      session.state = 'error'
      session.error = status.output || session.output || 'Codex login did not complete successfully'
    })

    this.codexSessions.set(sessionId, session)
    return toCodexLoginSession(session)
  }

  getCodexLoginSession(sessionId: string) {
    const session = this.codexSessions.get(sessionId)
    if (!session) {
      throw new Error('Codex login session not found')
    }

    return toCodexLoginSession(session)
  }

  async cancelCodexLogin(sessionId: string) {
    const session = this.codexSessions.get(sessionId)
    if (!session) {
      return
    }

    session.state = 'cancelled'
    session.error = null
    if (session.process && !session.process.killed) {
      session.process.kill('SIGTERM')
    }
  }

  async saveCustomProvider(input: CustomAuthConfigInput) {
    this.updateConfig((config) => ({
      ...config,
      custom: {
        name: input.name?.trim() || undefined,
        baseUrl: input.baseUrl.trim(),
        model: input.model.trim(),
        apiKey: input.apiKey.trim(),
        connectedAt: new Date().toISOString(),
      },
    }))
  }

  async clearCustomProvider() {
    this.updateConfig((config) => {
      const nextConfig = { ...config }
      delete nextConfig.custom
      return nextConfig
    })
  }
}
