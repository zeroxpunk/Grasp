import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface StoredAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string
  refreshExpiresAt: string
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}

export class AuthTokenStore {
  private encryptedPath = path.join(app.getPath('userData'), 'auth.enc')
  private fallbackPath = path.join(app.getPath('userData'), 'auth.json')

  get(): StoredAuthTokens | null {
    try {
      if (existsSync(this.encryptedPath) && safeStorage.isEncryptionAvailable()) {
        const encrypted = readFileSync(this.encryptedPath)
        return JSON.parse(safeStorage.decryptString(encrypted)) as StoredAuthTokens
      }
      if (existsSync(this.fallbackPath)) {
        return JSON.parse(readFileSync(this.fallbackPath, 'utf8')) as StoredAuthTokens
      }
    } catch {
      return null
    }
    return null
  }

  save(tokens: StoredAuthTokens): void {
    const directory = path.dirname(this.encryptedPath)
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true })
    }

    const payload = JSON.stringify(tokens)
    if (safeStorage.isEncryptionAvailable()) {
      writeFileSync(this.encryptedPath, safeStorage.encryptString(payload))
      if (existsSync(this.fallbackPath)) unlinkSync(this.fallbackPath)
      return
    }

    writeFileSync(this.fallbackPath, payload, 'utf8')
  }

  clear(): void {
    try {
      if (existsSync(this.encryptedPath)) unlinkSync(this.encryptedPath)
      if (existsSync(this.fallbackPath)) unlinkSync(this.fallbackPath)
    } catch {}
  }
}
