import { eq, and } from 'drizzle-orm'
import { exercises } from '../schema/exercises.js'
import { getDb } from '../client.js'

export function listByLesson(lessonId: string) {
  return getDb()
    .select()
    .from(exercises)
    .where(eq(exercises.lessonId, lessonId))
    .orderBy(exercises.exerciseNumber)
}

export function findByLessonAndNumber(lessonId: string, exerciseNumber: number) {
  return getDb()
    .select()
    .from(exercises)
    .where(and(eq(exercises.lessonId, lessonId), eq(exercises.exerciseNumber, exerciseNumber)))
    .limit(1)
    .then(r => r[0] ?? null)
}

export function insertMany(data: {
  lessonId: string
  exerciseNumber: number
  type: string
  title: string
  prompt: string
  data: Record<string, unknown>
}[]) {
  if (data.length === 0) return Promise.resolve([])
  return getDb().insert(exercises).values(data).returning()
}

export function deleteByLesson(lessonId: string) {
  return getDb().delete(exercises).where(eq(exercises.lessonId, lessonId))
}
