import type { AuthProvider } from './types'
import { authConfig } from './config'
import { DevAuthProvider } from './dev-provider'
import { SessionAuthProvider } from './session-provider'

export type { AuthUser, AuthProvider } from './types'

export function createAuthProvider(): AuthProvider {
  if (authConfig.providerMode === 'dev') {
    return new DevAuthProvider()
  }

  return new SessionAuthProvider()
}
