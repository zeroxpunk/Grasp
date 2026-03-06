import type { Exercise } from '@grasp/ai'
import {
  runCourseCreationPipeline,
  runLessonGenerationPipeline,
  runExerciseGenerationPipeline,
} from '@grasp/ai'
import { courseQueries, lessonQueries, masteryQueries, userQueries } from '@grasp/db'
import type { CourseRow, LessonRow } from '../lib/db-types.js'
import * as courseService from './course-service.js'
import * as exerciseService from './exercise-service.js'
import * as imageService from './image-service.js'
import { getAI } from './ai-service.js'
import { cacheResearch, getCachedResearch } from './research-cache-service.js'
import type { CourseManifestRecord } from './course-service.js'

interface CourseCreationResult {
  courseId: string
  slug: string
  title: string
  lessonCount: number
}

interface LessonGenerationResult {
  lessonNumber: number
  exerciseCount: number
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function createUniqueSlug(baseSlug: string, used: Set<string>) {
  const normalizedBase = baseSlug || 'lesson'
  let slug = normalizedBase
  let suffix = 2

  while (used.has(slug)) {
    slug = `${normalizedBase}-${suffix}`
    suffix += 1
  }

  used.add(slug)
  return slug
}

async function loadCourseContext(courseId: string): Promise<{
  course: CourseRow
  manifest: CourseManifestRecord
}> {
  const [course, manifest] = await Promise.all([
    courseService.getCourseById(courseId),
    courseService.getCourseManifestById(courseId),
  ])

  if (!course || !manifest) {
    throw new Error('Course not found')
  }

  return { course, manifest }
}

async function loadLessonContext(courseId: string, lessonNumber: number): Promise<{
  course: CourseRow
  manifest: CourseManifestRecord
  lesson: LessonRow
}> {
  const [{ course, manifest }, lesson] = await Promise.all([
    loadCourseContext(courseId),
    lessonQueries.findByCourseAndNumber(courseId, lessonNumber),
  ])

  if (!lesson) {
    throw new Error('Lesson not found')
  }

  return { course, manifest, lesson }
}

async function seedMastery(courseId: string, lessons: Array<{ concepts: string[] }>) {
  const concepts = new Set<string>()

  for (const lesson of lessons) {
    for (const concept of lesson.concepts) {
      concepts.add(concept)
    }
  }

  await Promise.all(
    [...concepts].map((concept) => masteryQueries.upsert(courseId, concept, 0)),
  )
}

export async function createCourseLessons(
  courseId: string,
  lessons: Array<{ number: number; slug: string; title: string; concepts: string[] }>,
  enhancedTitles: string[],
) {
  const usedLessonSlugs = new Set<string>()

  return lessonQueries.insertMany(
    lessons.map((lesson, index) => ({
      courseId,
      number: lesson.number || index + 1,
      slug: createUniqueSlug(sanitizeSlug(lesson.slug || lesson.title), usedLessonSlugs),
      title: enhancedTitles[index] || lesson.title,
      concepts: lesson.concepts || [],
      status: 'not_created',
    })),
  )
}

export async function createCourse(
  userId: string,
  description: string,
  context?: string,
): Promise<CourseCreationResult> {
  const user = await userQueries.findById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  const cachedResearch = await getCachedResearch(description, context)

  const pipelineResult = await runCourseCreationPipeline(getAI(), {
    description,
    context,
    globalMemory: user.globalMemory,
    cachedResearch: cachedResearch ?? undefined,
  })

  if (!cachedResearch) {
    await cacheResearch(description, context, pipelineResult.research)
  }

  const slug = await courseService.ensureUniqueSlug(
    userId,
    sanitizeSlug(pipelineResult.plan.slug || pipelineResult.plan.title),
  )

  let courseId: string | null = null

  try {
    const course = await courseQueries.insert({
      userId,
      slug,
      title: pipelineResult.plan.title,
      description: pipelineResult.plan.description,
      context: context ?? '',
      memory: pipelineResult.courseMemory,
      generationStatus: 'running',
    })
    courseId = course.id

    const lessonRows = await createCourseLessons(
      course.id,
      pipelineResult.plan.lessons,
      pipelineResult.enhancedTitles,
    )
    await seedMastery(course.id, lessonRows)

    const firstLesson = lessonRows.find((lesson) => lesson.number === 1) ?? lessonRows[0]
    if (!firstLesson) {
      throw new Error('Generated course plan contained no lessons')
    }

    const content = await imageService.processMarkdownVisuals(
      pipelineResult.firstLessonContent,
      course.id,
      slug,
    )
    await lessonQueries.updateContent(firstLesson.id, content)

    if (pipelineResult.firstLessonExercises.length > 0) {
      await exerciseService.replaceExercises(firstLesson.id, pipelineResult.firstLessonExercises)
    }

    await courseQueries.updateStatus(course.id, 'completed', null)

    return {
      courseId: course.id,
      slug: course.slug,
      title: course.title,
      lessonCount: lessonRows.length,
    }
  } catch (err) {
    if (courseId) {
      await courseQueries.updateStatus(
        courseId,
        'failed',
        err instanceof Error ? err.message : String(err),
      )
    }
    throw err
  }
}

export async function generateLesson(
  courseId: string,
  lessonNumber: number,
): Promise<LessonGenerationResult> {
  const { course, manifest, lesson } = await loadLessonContext(courseId, lessonNumber)
  const user = await userQueries.findById(course.userId)
  if (!user) {
    throw new Error('User not found')
  }

  await lessonQueries.updateGenerationStatus(lesson.id, 'running', null)

  try {
    const result = await runLessonGenerationPipeline(getAI(), {
      manifest,
      globalMemory: user.globalMemory,
      courseMemory: course.memory,
      courseContext: course.context,
      lessonNumber,
    })

    const content = await imageService.processMarkdownVisuals(
      result.content,
      course.id,
      course.slug,
    )
    await lessonQueries.updateContent(lesson.id, content)

    if (result.exercises.length > 0) {
      await exerciseService.replaceExercises(lesson.id, result.exercises)
    }

    await lessonQueries.updateGenerationStatus(lesson.id, 'completed', null)

    return {
      lessonNumber,
      exerciseCount: result.exercises.length,
    }
  } catch (err) {
    await lessonQueries.updateGenerationStatus(
      lesson.id,
      'failed',
      err instanceof Error ? err.message : String(err),
    )
    throw err
  }
}

export async function regenerateExercises(
  courseId: string,
  lessonNumber: number,
): Promise<LessonGenerationResult> {
  const { course, manifest, lesson } = await loadLessonContext(courseId, lessonNumber)

  if (!lesson.content) {
    throw new Error('Lesson content has not been generated yet')
  }

  const exercises = await runExerciseGenerationPipeline(getAI(), {
    manifest,
    courseMemory: course.memory,
    lessonNumber,
    lessonTitle: lesson.title,
    concepts: lesson.concepts,
    lessonContent: lesson.content,
  })

  await exerciseService.replaceExercises(lesson.id, exercises)

  return {
    lessonNumber,
    exerciseCount: exercises.length,
  }
}

export async function getNextNotCreatedLesson(courseId: string) {
  const lessons = await lessonQueries.listByCourse(courseId)
  return lessons.find((lesson) => lesson.status === 'not_created') ?? null
}
