import { eq, desc } from 'drizzle-orm'
import { jobs } from '../schema/jobs.js'
import { getDb } from '../client.js'

export function findById(id: string) {
  return getDb().select().from(jobs).where(eq(jobs.id, id)).limit(1).then(r => r[0] ?? null)
}

export function listByUser(userId: string, limit = 20) {
  return getDb()
    .select()
    .from(jobs)
    .where(eq(jobs.userId, userId))
    .orderBy(desc(jobs.createdAt))
    .limit(limit)
}

export function insert(data: {
  userId: string
  type: string
  payload: Record<string, unknown>
  courseId?: string | null
  lessonId?: string | null
}) {
  return getDb().insert(jobs).values({
    userId: data.userId,
    type: data.type,
    payload: data.payload,
    courseId: data.courseId ?? null,
    lessonId: data.lessonId ?? null,
  }).returning().then(r => r[0]!)
}

export function update(id: string, data: {
  status?: string
  result?: Record<string, unknown> | null
  error?: string | null
  courseId?: string | null
  lessonId?: string | null
  startedAt?: Date | null
  completedAt?: Date | null
}) {
  return getDb().update(jobs).set(data).where(eq(jobs.id, id))
}
