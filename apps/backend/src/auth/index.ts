import type { AuthProvider } from './types.js'
import { DevAuthProvider } from './dev-provider.js'

export type { AuthUser, AuthProvider } from './types.js'

export function createAuthProvider(): AuthProvider {
  if (process.env.NODE_ENV !== 'production') {
    return new DevAuthProvider()
  }
  throw new Error('Production auth provider not yet implemented. Set NODE_ENV to development or implement a production provider.')
}
