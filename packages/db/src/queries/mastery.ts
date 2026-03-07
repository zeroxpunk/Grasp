import { eq } from 'drizzle-orm'
import { mastery } from '../schema/mastery'
import { getDb } from '../client'

export function listByCourse(courseId: string) {
  return getDb().select().from(mastery).where(eq(mastery.courseId, courseId))
}

export function upsert(courseId: string, concept: string, level: number) {
  return getDb()
    .insert(mastery)
    .values({ courseId, concept, level })
    .onConflictDoUpdate({
      target: [mastery.courseId, mastery.concept],
      set: { level, updatedAt: new Date() },
    })
}
