import { authSessionQueries, userQueries } from '@grasp/db'
import { hashToken } from '../utils/tokens.js'
import { toAuthUser } from './user-mapper.js'
import type { AuthProvider, AuthUser } from './types.js'

export class SessionAuthProvider implements AuthProvider {
  name = 'session'

  async verify(token: string): Promise<AuthUser | null> {
    const session = await authSessionQueries.findActiveByAccessTokenHash(hashToken(token))
    if (!session) {
      return null
    }

    const user = await userQueries.findById(session.userId)
    return user ? toAuthUser(user) : null
  }
}
