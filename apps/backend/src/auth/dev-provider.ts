import { userQueries } from '@grasp/db'
import type { AuthProvider, AuthUser } from './types.js'

const DEV_EMAIL = 'dev@grasp.local'

export class DevAuthProvider implements AuthProvider {
  name = 'dev'

  async verify(_token: string): Promise<AuthUser | null> {
    const existing = await userQueries.findByEmail(DEV_EMAIL)

    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        displayName: existing.displayName,
        avatarUrl: existing.avatarUrl,
      }
    }

    const inserted = await userQueries.insert({
      email: DEV_EMAIL,
      displayName: 'Dev User',
      authProvider: 'dev',
      authProviderId: 'dev-user-1',
    })

    return {
      id: inserted.id,
      email: inserted.email,
      displayName: inserted.displayName,
      avatarUrl: inserted.avatarUrl,
    }
  }
}
