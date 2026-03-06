import { and, eq } from 'drizzle-orm'
import { users } from '../schema/users.js'
import { getDb } from '../client.js'

export function findById(id: string) {
  return getDb().select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0] ?? null)
}

export function findByEmail(email: string) {
  return getDb().select().from(users).where(eq(users.email, email)).limit(1).then(r => r[0] ?? null)
}

export function findByAuthIdentity(authProvider: string, authProviderId: string) {
  return getDb()
    .select()
    .from(users)
    .where(and(eq(users.authProvider, authProvider), eq(users.authProviderId, authProviderId)))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export function insert(data: {
  email: string
  displayName?: string | null
  avatarUrl?: string | null
  authProvider: string
  authProviderId: string
}) {
  return getDb().insert(users).values(data).returning().then(r => r[0]!)
}

export function syncAuthIdentity(id: string, data: {
  email: string
  displayName?: string | null
  avatarUrl?: string | null
  authProvider: string
  authProviderId: string
}) {
  return getDb()
    .update(users)
    .set({
      email: data.email,
      displayName: data.displayName ?? null,
      avatarUrl: data.avatarUrl ?? null,
      authProvider: data.authProvider,
      authProviderId: data.authProviderId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()
    .then((rows) => rows[0]!)
}

export async function upsertFromAuthIdentity(data: {
  email: string
  displayName?: string | null
  avatarUrl?: string | null
  authProvider: string
  authProviderId: string
}) {
  const byIdentity = await findByAuthIdentity(data.authProvider, data.authProviderId)
  if (byIdentity) {
    return syncAuthIdentity(byIdentity.id, data)
  }

  const byEmail = await findByEmail(data.email)
  if (byEmail) {
    return syncAuthIdentity(byEmail.id, data)
  }

  return insert(data)
}

export function update(id: string, data: {
  displayName?: string | null
  globalMemory?: string
  updatedAt?: Date
}) {
  return getDb().update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id))
}
