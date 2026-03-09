import { eq, and, asc, desc } from 'drizzle-orm'
import { getDb } from '../client';
import { chatMessages } from '../schema/index';

export function listByLessonAndUser(lessonId: string, userId: string) {
  return getDb()
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.lessonId, lessonId), eq(chatMessages.userId, userId)))
    .orderBy(asc(chatMessages.seq))
}

export function deleteByLessonAndUser(lessonId: string, userId: string) {
  return getDb()
    .delete(chatMessages)
    .where(and(eq(chatMessages.lessonId, lessonId), eq(chatMessages.userId, userId)))
}

export function listRecentByUser(userId: string, limit = 20) {
  return getDb()
    .select({ content: chatMessages.content })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.role, 'user')))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
}

export function insertMany(data: {
  lessonId: string
  userId: string
  role: string
  content: string
  exerciseId?: string | null
  seq: number
}[]) {
  if (data.length === 0) return Promise.resolve()
  return getDb().insert(chatMessages).values(data)
}
