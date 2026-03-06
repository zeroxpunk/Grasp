import { authConfig } from './config.js'
import type { AuthIdentity, DesktopAuthCodeResolver } from './types.js'

const DEV_AUTH_IDENTITY: AuthIdentity = {
  provider: 'dev',
  providerId: 'dev-user-1',
  email: 'dev@grasp.local',
  displayName: 'Dev User',
  avatarUrl: null,
}

export function createDesktopAuthCodeResolver(): DesktopAuthCodeResolver | null {
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return {
    async exchangeCode(code: string) {
      return code === authConfig.devDesktopAuthCode ? DEV_AUTH_IDENTITY : null
    },
  }
}
