import { eq } from 'drizzle-orm'
import { users } from '../schema/users.js'
import { getDb } from '../client.js'

export function findById(id: string) {
  return getDb().select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0] ?? null)
}

export function findByEmail(email: string) {
  return getDb().select().from(users).where(eq(users.email, email)).limit(1).then(r => r[0] ?? null)
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

export function update(id: string, data: {
  displayName?: string | null
  globalMemory?: string
  updatedAt?: Date
}) {
  return getDb().update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id))
}
