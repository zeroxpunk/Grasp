import { eq, and, inArray, sql } from 'drizzle-orm'
import { exerciseProgress } from '../schema/exercise-progress.js'
import { getDb } from '../client.js'

export function findByExerciseAndUser(exerciseId: string, userId: string) {
  return getDb()
    .select()
    .from(exerciseProgress)
    .where(and(eq(exerciseProgress.exerciseId, exerciseId), eq(exerciseProgress.userId, userId)))
    .limit(1)
    .then(r => r[0] ?? null)
}

export function listByExerciseIds(exerciseIds: string[], userId: string) {
  if (exerciseIds.length === 0) return Promise.resolve([])
  return getDb()
    .select()
    .from(exerciseProgress)
    .where(and(inArray(exerciseProgress.exerciseId, exerciseIds), eq(exerciseProgress.userId, userId)))
}

export function upsert(data: {
  exerciseId: string
  userId: string
  status: string
}) {
  return getDb()
    .insert(exerciseProgress)
    .values(data)
    .onConflictDoUpdate({
      target: [exerciseProgress.exerciseId, exerciseProgress.userId],
      set: {
        status: sql`CASE WHEN ${exerciseProgress.status} = 'completed' THEN ${exerciseProgress.status} ELSE ${data.status} END`,
        attemptedAt: new Date(),
      },
    })
}
