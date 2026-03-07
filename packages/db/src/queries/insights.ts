import { eq, desc } from 'drizzle-orm'
import { insights } from '../schema/insights'
import { getDb } from '../client'

export function listByCourse(courseId: string) {
  return getDb()
    .select()
    .from(insights)
    .where(eq(insights.courseId, courseId))
    .orderBy(desc(insights.createdAt))
}

export function insertMany(data: { courseId: string; kind: string; observation: string }[]) {
  if (data.length === 0) return Promise.resolve()
  return getDb().insert(insights).values(data)
}
