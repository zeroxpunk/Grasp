import {
  lessonQueries,
  exerciseQueries,
  exerciseProgressQueries,
} from '@grasp/db'

export async function getLessonDetail(courseId: string, lessonNumber: number, userId: string) {
  const lesson = await lessonQueries.findByCourseAndNumber(courseId, lessonNumber)
  if (!lesson) return null

  const [lessonExercises, allLessons] = await Promise.all([
    exerciseQueries.listByLesson(lesson.id),
    lessonQueries.listSummaryByCourse(courseId),
  ])

  const exerciseIds = lessonExercises.map((e) => e.id)
  const progressEntries = await exerciseProgressQueries.listByExerciseIds(exerciseIds, userId)

  const exerciseIdToNumber = new Map(lessonExercises.map((e) => [e.id, e.exerciseNumber]))
  const progressMap: Record<number, { status: string; attemptedAt: string }> = {}
  for (const p of progressEntries) {
    const num = exerciseIdToNumber.get(p.exerciseId)
    if (num !== undefined) {
      progressMap[num] = {
        status: p.status,
        attemptedAt: p.attemptedAt.toISOString(),
      }
    }
  }

  const currentIdx = allLessons.findIndex((l) => l.number === lessonNumber)
  const previousLesson = currentIdx > 0 ? allLessons[currentIdx - 1]! : null
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1]! : null

  return {
    number: lesson.number,
    slug: lesson.slug,
    title: lesson.title,
    concepts: lesson.concepts,
    status: lesson.status,
    content: lesson.content,
    exercises: lessonExercises.map((e) => ({
      id: e.exerciseNumber,
      type: e.type,
      title: e.title,
      prompt: e.prompt,
      data: e.data,
    })),
    exerciseProgress: progressMap,
    previousLesson,
    nextLesson,
  }
}

export async function getLessonByNumber(courseId: string, lessonNumber: number) {
  return lessonQueries.findByCourseAndNumber(courseId, lessonNumber)
}
