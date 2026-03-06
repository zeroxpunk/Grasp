import type { AuthUser } from './types.js'

export function toAuthUser(user: {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}
