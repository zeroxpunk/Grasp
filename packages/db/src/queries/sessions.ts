import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { sessions } from '../schema/sessions'
import { getDb } from '../client'

export function listByUser(userId: string) {
  return getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.startedAt))
}

export function findActiveByUser(userId: string) {
  return getDb()
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.endedAt)))
}

export function findFirstActiveByUser(userId: string) {
  return getDb()
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.endedAt)))
    .limit(1)
    .then(r => r[0] ?? null)
}

export function insert(data: { userId: string; courseSlug?: string | null }) {
  return getDb()
    .insert(sessions)
    .values({ userId: data.userId, courseSlug: data.courseSlug ?? null })
    .returning()
    .then(r => r[0]!)
}

export function endById(id: string) {
  return getDb()
    .update(sessions)
    .set({ endedAt: new Date() })
    .where(eq(sessions.id, id))
    .returning()
    .then(r => r[0] ?? null)
}

export async function endActiveAndInsert(userId: string, courseSlug?: string | null) {
  const db = getDb()
  await db
    .update(sessions)
    .set({ endedAt: sql`NOW()` })
    .where(and(eq(sessions.userId, userId), isNull(sessions.endedAt)))

  return db
    .insert(sessions)
    .values({ userId, courseSlug: courseSlug ?? null })
    .returning()
    .then(r => r[0]!)
}
