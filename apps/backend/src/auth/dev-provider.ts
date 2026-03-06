import { userQueries } from '@grasp/db'
import type { AuthProvider, AuthUser } from './types.js'

const DEV_EMAIL = 'dev@grasp.local'

export class DevAuthProvider implements AuthProvider {
  name = 'dev'

  async verify(_token: string): Promise<AuthUser | null> {
    const user = await userQueries.upsertFromAuthIdentity({
      email: DEV_EMAIL,
      displayName: 'Dev User',
      avatarUrl: null,
      authProvider: 'dev',
      authProviderId: 'dev-user-1',
    })

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    }
  }
}
