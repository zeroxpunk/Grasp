import type { AuthProvider } from './types.js'
import { authConfig } from './config.js'
import { DevAuthProvider } from './dev-provider.js'
import { SessionAuthProvider } from './session-provider.js'

export type { AuthUser, AuthProvider } from './types.js'

export function createAuthProvider(): AuthProvider {
  if (authConfig.providerMode === 'dev') {
    return new DevAuthProvider()
  }

  return new SessionAuthProvider()
}
