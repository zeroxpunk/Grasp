import { and, asc, desc, eq, isNull, lt } from 'drizzle-orm'
import { jobs } from '../schema/jobs'
import { getDb } from '../client'

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

export function listPending(limit = 20) {
  return getDb()
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'pending'))
    .orderBy(asc(jobs.createdAt))
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

export async function claimNextPending() {
  const nextJob = await getDb()
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'pending'))
    .orderBy(asc(jobs.createdAt))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!nextJob) {
    return null
  }

  return getDb()
    .update(jobs)
    .set({
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      error: null,
    })
    .where(and(eq(jobs.id, nextJob.id), eq(jobs.status, 'pending')))
    .returning()
    .then((rows) => rows[0] ?? null)
}

export function requeueStaleRunning(cutoff: Date) {
  return getDb()
    .update(jobs)
    .set({
      status: 'pending',
      startedAt: null,
      completedAt: null,
      error: null,
    })
    .where(
      and(
        eq(jobs.status, 'running'),
        isNull(jobs.completedAt),
        lt(jobs.startedAt, cutoff),
      ),
    )
}
