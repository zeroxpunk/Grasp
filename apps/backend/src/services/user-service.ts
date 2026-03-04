import { userQueries } from '@grasp/db'

export async function getProfile(userId: string) {
  const user = await userQueries.findById(userId)
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    globalMemory: user.globalMemory,
  }
}

export async function updateProfile(userId: string, data: { displayName?: string; globalMemory?: string }) {
  await userQueries.update(userId, data)
  return { ok: true as const }
}
