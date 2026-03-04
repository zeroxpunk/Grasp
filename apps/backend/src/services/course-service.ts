import type { CourseManifest, LessonStatus } from '@grasp/ai'
import { courseQueries, lessonQueries, masteryQueries } from '@grasp/db'
import type { CourseRow, LessonRow, MasteryRow } from '../lib/db-types.js'

export type CourseManifestRecord = CourseManifest & { generationStatus: string }

function buildMasteryMap(rows: MasteryRow[]) {
  const masteryMap: Record<string, number> = {}

  for (const row of rows) {
    masteryMap[row.concept] = row.level
  }

  return masteryMap
}

function buildManifest(
  course: CourseRow,
  courseLessons: LessonRow[],
  courseMastery: MasteryRow[],
): CourseManifestRecord {
  return {
    slug: course.slug,
    title: course.title,
    description: course.description,
    createdAt: course.createdAt.toISOString(),
    generationStatus: course.generationStatus,
    lessons: courseLessons.map((l) => ({
      number: l.number,
      slug: l.slug,
      title: l.title,
      concepts: l.concepts,
      status: l.status as LessonStatus,
    })),
    mastery: buildMasteryMap(courseMastery),
  }
}

export async function listCourses(userId: string) {
  const userCourses = await courseQueries.listByUser(userId)
  const courseEntries = await Promise.all(
    userCourses.map(async (course) => ({
      course,
      lessons: await lessonQueries.listByCourse(course.id),
    })),
  )

  return courseEntries.map(({ course, lessons }) => {
    const courseLessons = lessons
    const total = courseLessons.length
    const completed = courseLessons.filter((l) => l.status === 'completed').length

    return {
      slug: course.slug,
      title: course.title,
      description: course.description,
      createdAt: course.createdAt.toISOString(),
      totalLessons: total,
      completedLessons: completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })
}

export async function getCourseManifest(userId: string, slug: string) {
  const course = await courseQueries.findByUserAndSlug(userId, slug)
  if (!course) return null

  const [courseLessons, courseMastery] = await Promise.all([
    lessonQueries.listByCourse(course.id),
    masteryQueries.listByCourse(course.id),
  ])

  return buildManifest(course, courseLessons, courseMastery)
}

export async function getCourseManifestById(courseId: string) {
  const course = await courseQueries.findById(courseId)
  if (!course) return null

  const [courseLessons, courseMastery] = await Promise.all([
    lessonQueries.listByCourse(course.id),
    masteryQueries.listByCourse(course.id),
  ])

  return buildManifest(course, courseLessons, courseMastery)
}

export async function getCourseBySlug(userId: string, slug: string) {
  return courseQueries.findByUserAndSlug(userId, slug)
}

export async function getCourseById(courseId: string) {
  return courseQueries.findById(courseId)
}

export async function updateCourse(courseId: string, data: {
  slug?: string
  title?: string
  description?: string
  context?: string
  memory?: string
  generationStatus?: string
  generationError?: string | null
}) {
  return courseQueries.update(courseId, data)
}

export async function appendInsightsToCourseMemory(
  courseId: string,
  insights: Array<{ kind: string; observation: string }>,
) {
  if (insights.length === 0) return

  const course = await courseQueries.findById(courseId)
  if (!course) {
    throw new Error('Course not found')
  }

  const today = new Date().toISOString().slice(0, 10)
  const section = [
    `## Insights — ${today}`,
    '',
    ...insights.map((insight) => `- **${insight.kind}**: ${insight.observation}`),
  ].join('\n')

  const existing = course.memory.trimEnd()
  const memory = existing ? `${existing}\n\n${section}\n` : `${section}\n`
  await courseQueries.update(courseId, { memory })
}

export async function ensureUniqueSlug(userId: string, baseSlug: string) {
  const normalizedBase = baseSlug || 'course'
  let slug = normalizedBase
  let suffix = 2

  while (await courseQueries.findByUserAndSlug(userId, slug)) {
    slug = `${normalizedBase}-${suffix}`
    suffix += 1
  }

  return slug
}

export async function deleteCourse(userId: string, slug: string) {
  return courseQueries.deleteByUserAndSlug(userId, slug)
}
