import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { ClaudeConnectionMode, CodexConnectionMode } from '../../shared/ai-auth'

export type StoredAiAuthConfig = {
  claude?: {
    mode: ClaudeConnectionMode
    connectedAt: string
    apiKey?: string
    oauthToken?: string
  }
  codex?: {
    mode: CodexConnectionMode
    connectedAt: string
    apiKey?: string
  }
  custom?: {
    connectedAt: string
    name?: string
    baseUrl: string
    model: string
    apiKey: string
  }
}

export class AiAuthStore {
  private encryptedPath = path.join(app.getPath('userData'), 'ai-auth.dat')
  private fallbackPath = path.join(app.getPath('userData'), 'ai-auth.json')

  load(): StoredAiAuthConfig {
    try {
      if (existsSync(this.encryptedPath) && safeStorage.isEncryptionAvailable()) {
        const encrypted = readFileSync(this.encryptedPath)
        return JSON.parse(safeStorage.decryptString(encrypted)) as StoredAiAuthConfig
      }

      if (existsSync(this.fallbackPath)) {
        return JSON.parse(readFileSync(this.fallbackPath, 'utf8')) as StoredAiAuthConfig
      }
    } catch {
      return {}
    }

    return {}
  }

  save(config: StoredAiAuthConfig) {
    const directory = path.dirname(this.encryptedPath)
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true })
    }

    const payload = JSON.stringify(config)
    if (safeStorage.isEncryptionAvailable()) {
      writeFileSync(this.encryptedPath, safeStorage.encryptString(payload))
      if (existsSync(this.fallbackPath)) {
        unlinkSync(this.fallbackPath)
      }
      return
    }

    writeFileSync(this.fallbackPath, payload, 'utf8')
  }
}
