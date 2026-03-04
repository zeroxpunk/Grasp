import { insightQueries, lessonQueries, masteryQueries } from '@grasp/db'
import type { LessonRow } from '../lib/db-types.js'

export interface PlanChange {
  action: 'add' | 'remove' | 'skip'
  lessonTitle?: string
  concepts?: string[]
  afterLesson?: number
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface EvaluationInput {
  courseId: string
  lessonNumber: number
  masteryUpdates: { concept: string; level: number }[]
  insightEntries: { kind: string; observation: string }[]
  lessonComplete: boolean
}

export async function applyEvaluation(input: EvaluationInput) {
  await Promise.all([
    Promise.all(
      input.masteryUpdates.map((update) =>
        masteryQueries.upsert(input.courseId, update.concept, update.level),
      ),
    ),
    insightQueries.insertMany(
      input.insightEntries.map((entry) => ({
        courseId: input.courseId,
        kind: entry.kind,
        observation: entry.observation,
      })),
    ),
    lessonQueries.updateStatus(
      input.courseId,
      input.lessonNumber,
      input.lessonComplete ? 'completed' : 'failed',
    ),
  ])
}

async function markLessonSkipped(
  lessons: LessonRow[],
  lessonTitle: string,
) {
  const target = lessons.find(
    (lesson) => lesson.title === lessonTitle && lesson.status === 'not_created',
  )

  if (!target) return lessons

  await lessonQueries.update(target.id, { status: 'completed' })

  return lessons.map((lesson) =>
    lesson.id === target.id ? { ...lesson, status: 'completed' } : lesson,
  )
}

async function shiftLessonsAfter(
  lessons: LessonRow[],
  afterLesson: number,
) {
  const lessonsToShift = lessons
    .filter((lesson) => lesson.number > afterLesson)
    .sort((a, b) => b.number - a.number)

  for (const lesson of lessonsToShift) {
    await lessonQueries.update(lesson.id, { number: lesson.number + 1 })
  }

  return lessons.map((lesson) =>
    lesson.number > afterLesson ? { ...lesson, number: lesson.number + 1 } : lesson,
  )
}

function createLessonSlug(
  lessons: LessonRow[],
  lessonTitle: string,
) {
  const existingSlugs = new Set(lessons.map((lesson) => lesson.slug))
  const baseSlug = sanitizeSlug(lessonTitle) || 'lesson'
  let slug = baseSlug
  let suffix = 2

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}

async function insertLessonAfter(
  courseId: string,
  lessons: LessonRow[],
  change: {
    lessonTitle: string
    concepts?: string[]
    afterLesson?: number
  },
) {
  const afterLesson = Number.isInteger(change.afterLesson)
    ? change.afterLesson as number
    : (lessons[lessons.length - 1]?.number ?? 0)

  const shiftedLessons = await shiftLessonsAfter(lessons, afterLesson)
  const inserted = await lessonQueries.insertMany([{
    courseId,
    number: afterLesson + 1,
    slug: createLessonSlug(shiftedLessons, change.lessonTitle),
    title: change.lessonTitle,
    concepts: change.concepts ?? [],
    status: 'not_created',
  }])

  await Promise.all(
    [...new Set(change.concepts ?? [])].map((concept) =>
      masteryQueries.upsert(courseId, concept, 0),
    ),
  )

  return [...shiftedLessons, ...inserted].sort((a, b) => a.number - b.number)
}

export async function applyPlanChanges(
  courseId: string,
  changes: PlanChange[] | undefined,
) {
  if (!changes || changes.length === 0) return

  let lessons = await lessonQueries.listByCourse(courseId)

  for (const change of changes) {
    if ((change.action === 'skip' || change.action === 'remove') && change.lessonTitle) {
      lessons = await markLessonSkipped(lessons, change.lessonTitle)
      continue
    }

    if (change.action === 'add' && change.lessonTitle) {
      lessons = await insertLessonAfter(courseId, lessons, {
        lessonTitle: change.lessonTitle,
        concepts: change.concepts,
        afterLesson: change.afterLesson,
      })
    }
  }
}
