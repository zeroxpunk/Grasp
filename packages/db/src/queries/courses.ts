import { eq, and, desc } from 'drizzle-orm'
import { courses } from '../schema/courses.js'
import { getDb } from '../client.js'

export function findById(id: string) {
  return getDb()
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1)
    .then(r => r[0] ?? null)
}

export function findByUserAndSlug(userId: string, slug: string) {
  return getDb()
    .select()
    .from(courses)
    .where(and(eq(courses.userId, userId), eq(courses.slug, slug)))
    .limit(1)
    .then(r => r[0] ?? null)
}

export function listByUser(userId: string) {
  return getDb()
    .select()
    .from(courses)
    .where(eq(courses.userId, userId))
    .orderBy(desc(courses.createdAt))
}

export function insert(data: {
  userId: string
  slug: string
  title: string
  description: string
  context?: string
  memory?: string
  generationStatus?: string
}) {
  return getDb().insert(courses).values(data).returning().then(r => r[0]!)
}

export function updateStatus(id: string, generationStatus: string, generationError?: string | null) {
  return getDb()
    .update(courses)
    .set({ generationStatus, generationError, updatedAt: new Date() })
    .where(eq(courses.id, id))
}

export function update(id: string, data: {
  slug?: string
  title?: string
  description?: string
  context?: string
  memory?: string
  generationStatus?: string
  generationError?: string | null
}) {
  return getDb()
    .update(courses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(courses.id, id))
    .returning()
    .then(r => r[0] ?? null)
}

export function deleteByUserAndSlug(userId: string, slug: string) {
  return getDb()
    .delete(courses)
    .where(and(eq(courses.userId, userId), eq(courses.slug, slug)))
    .returning({ id: courses.id })
    .then(r => r.length > 0)
}
