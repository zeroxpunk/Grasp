import { eq, and } from 'drizzle-orm'
import { lessons } from '../schema/lessons.js'
import { getDb } from '../client.js'

export function findByCourseAndNumber(courseId: string, number: number) {
  return getDb()
    .select()
    .from(lessons)
    .where(and(eq(lessons.courseId, courseId), eq(lessons.number, number)))
    .limit(1)
    .then(r => r[0] ?? null)
}

export function listByCourse(courseId: string) {
  return getDb()
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(lessons.number)
}

export function listSummaryByCourse(courseId: string) {
  return getDb()
    .select({
      number: lessons.number,
      slug: lessons.slug,
      title: lessons.title,
      status: lessons.status,
    })
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(lessons.number)
}

export function insertMany(data: {
  courseId: string
  number: number
  slug: string
  title: string
  concepts?: string[]
  status?: string
}[]) {
  if (data.length === 0) return Promise.resolve([])
  return getDb().insert(lessons).values(data).returning()
}

export function updateStatus(courseId: string, number: number, status: string) {
  return getDb()
    .update(lessons)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(lessons.courseId, courseId), eq(lessons.number, number)))
}

export function updateContent(id: string, content: string) {
  return getDb()
    .update(lessons)
    .set({ content, status: 'not_started', updatedAt: new Date() })
    .where(eq(lessons.id, id))
}

export function updateGenerationStatus(id: string, generationStatus: string, generationError?: string | null) {
  return getDb()
    .update(lessons)
    .set({ generationStatus, generationError, updatedAt: new Date() })
    .where(eq(lessons.id, id))
}

export function update(id: string, data: {
  number?: number
  slug?: string
  title?: string
  concepts?: string[]
  status?: string
  content?: string | null
  generationStatus?: string | null
  generationError?: string | null
}) {
  return getDb()
    .update(lessons)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(lessons.id, id))
    .returning()
    .then(r => r[0] ?? null)
}
