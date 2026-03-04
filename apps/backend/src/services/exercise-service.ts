import { normalizeExercises, type Exercise, type ExerciseProgress } from '@grasp/ai'
import { exerciseQueries, exerciseProgressQueries } from '@grasp/db'

function serializeExercise(exercise: Exercise) {
  const { id, type, title, prompt, ...data } = exercise as Exercise & Record<string, unknown>

  return {
    exerciseNumber: id,
    type,
    title,
    prompt,
    data,
  }
}

export async function listExercises(lessonId: string): Promise<Exercise[]> {
  const rows = await exerciseQueries.listByLesson(lessonId)
  return normalizeExercises(rows.map((row) => ({
    id: row.exerciseNumber,
    type: row.type,
    title: row.title,
    prompt: row.prompt,
    ...row.data,
  })))
}

export async function getProgressMap(
  lessonId: string,
  userId: string,
): Promise<Record<number, ExerciseProgress>> {
  const rows = await exerciseQueries.listByLesson(lessonId)
  const exerciseIds = rows.map((row) => row.id)
  const progressRows = await exerciseProgressQueries.listByExerciseIds(exerciseIds, userId)
  const numbersById = new Map(rows.map((row) => [row.id, row.exerciseNumber]))

  const progress: Record<number, ExerciseProgress> = {}
  for (const row of progressRows) {
    const number = numbersById.get(row.exerciseId)
    if (number !== undefined) {
      progress[number] = {
        status: row.status as ExerciseProgress['status'],
        attemptedAt: row.attemptedAt.toISOString(),
      }
    }
  }

  return progress
}

export async function replaceExercises(lessonId: string, exercises: Exercise[]) {
  await exerciseQueries.deleteByLesson(lessonId)
  await exerciseQueries.insertMany(
    exercises.map((exercise) => ({
      lessonId,
      ...serializeExercise(exercise),
    })),
  )
}

export async function updateProgress(
  lessonId: string,
  exerciseNumber: number,
  userId: string,
  status: 'attempted' | 'completed',
) {
  const exercise = await exerciseQueries.findByLessonAndNumber(lessonId, exerciseNumber)

  if (!exercise) {
    throw Object.assign(new Error('Exercise not found'), { status: 404 })
  }

  await exerciseProgressQueries.upsert({
    exerciseId: exercise.id,
    userId,
    status,
  })

  return { ok: true as const }
}
