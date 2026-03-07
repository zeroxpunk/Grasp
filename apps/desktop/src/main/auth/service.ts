import { shell } from 'electron'
import { GraspClient } from '@grasp/api-client'
import { AuthTokenStore, type StoredAuthTokens } from './store'

const GRASP_API_URL = process.env.GRASP_API_URL || 'http://localhost:4000'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || ''
const REDIRECT_URI = 'grasp://auth/callback'
const REFRESH_BUFFER_MS = 60_000

export class DesktopAuthService {
  private store = new AuthTokenStore()
  private client: GraspClient

  constructor() {
    this.client = new GraspClient({
      baseUrl: GRASP_API_URL,
      token: () => this.getAccessToken(),
    })
  }

  getClient(): GraspClient {
    return this.client
  }

  startGoogleLogin(): void {
    if (!GOOGLE_CLIENT_ID) return
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    })
    shell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  }

  async handleCallback(url: string): Promise<boolean> {
    const parsed = new URL(url)
    const code = parsed.searchParams.get('code')
    if (!code) return false

    try {
      const unauthClient = new GraspClient({ baseUrl: GRASP_API_URL })
      const session = await unauthClient.auth.exchangeGoogleCode(code, REDIRECT_URI, 'desktop')
      this.store.save({
        accessToken: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
        userId: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.avatarUrl,
      })
      return true
    } catch {
      return false
    }
  }

  async loginDev(): Promise<boolean> {
    try {
      const unauthClient = new GraspClient({ baseUrl: GRASP_API_URL })
      const session = await unauthClient.auth.exchangeDevCode('grasp-dev-login', 'desktop')
      this.store.save({
        accessToken: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
        userId: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.avatarUrl,
      })
      return true
    } catch {
      return false
    }
  }

  async getAccessToken(): Promise<string> {
    const tokens = this.store.get()
    if (!tokens) return ''

    if (Date.now() > new Date(tokens.expiresAt).getTime() - REFRESH_BUFFER_MS) {
      const refreshed = await this.refreshTokens(tokens)
      if (refreshed) return refreshed.accessToken
      return ''
    }

    return tokens.accessToken
  }

  isAuthenticated(): boolean {
    const tokens = this.store.get()
    if (!tokens) return false
    return Date.now() < new Date(tokens.refreshExpiresAt).getTime()
  }

  getUser(): { id: string; email: string; displayName: string | null; avatarUrl: string | null } | null {
    const tokens = this.store.get()
    if (!tokens) return null
    return {
      id: tokens.userId,
      email: tokens.email,
      displayName: tokens.displayName,
      avatarUrl: tokens.avatarUrl,
    }
  }

  async logout(): Promise<void> {
    const tokens = this.store.get()
    if (tokens) {
      try {
        const unauthClient = new GraspClient({
          baseUrl: GRASP_API_URL,
          token: tokens.accessToken,
        })
        await unauthClient.auth.logout(tokens.refreshToken)
      } catch {}
    }
    this.store.clear()
  }

  private async refreshTokens(tokens: StoredAuthTokens): Promise<StoredAuthTokens | null> {
    try {
      const unauthClient = new GraspClient({ baseUrl: GRASP_API_URL })
      const session = await unauthClient.auth.refresh(tokens.refreshToken, 'desktop')
      const updated: StoredAuthTokens = {
        accessToken: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
        userId: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.avatarUrl,
      }
      this.store.save(updated)
      return updated
    } catch {
      this.store.clear()
      return null
    }
  }
}
