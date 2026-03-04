import type { Exercise } from '@grasp/ai'
import { courseQueries, lessonQueries, masteryQueries, userQueries } from '@grasp/db'
import type { CourseRow, LessonRow, UserRow } from '../lib/db-types.js'
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

function toCoursePlanLessons(lessons: Array<{ number: number; title: string; concepts: string[] }>) {
  return lessons.map((lesson) => ({
    number: lesson.number,
    title: lesson.title,
    concepts: lesson.concepts,
  }))
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

async function loadGenerationContext(courseId: string, lessonNumber: number): Promise<{
  course: CourseRow
  manifest: CourseManifestRecord
  lesson: LessonRow
  user: UserRow
}> {
  const { course, manifest, lesson } = await loadLessonContext(courseId, lessonNumber)
  const user = await userQueries.findById(course.userId)

  if (!user) {
    throw new Error('User not found')
  }

  return { course, manifest, lesson, user }
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

async function generateExercisesForLesson(
  course: CourseRow,
  manifest: CourseManifestRecord,
  lesson: Pick<LessonRow, 'id' | 'number' | 'title' | 'concepts'>,
  lessonContent: string,
  options?: { maxOutputTokens?: number; thinkingBudget?: number },
): Promise<Exercise[]> {
  const exercises = await getAI().generateExercises({
    lessonTitle: lesson.title,
    concepts: lesson.concepts,
    lessonContent,
    lessonNumber: lesson.number,
    totalLessons: manifest.lessons.length,
    mastery: manifest.mastery,
    courseTitle: manifest.title,
    courseDescription: manifest.description,
    courseMemory: course.memory,
  }, options)

  await exerciseService.replaceExercises(lesson.id, exercises)
  return exercises
}

async function generateExercisesBestEffort(
  course: CourseRow,
  manifest: CourseManifestRecord,
  lesson: Pick<LessonRow, 'id' | 'number' | 'title' | 'concepts'>,
  lessonContent: string,
  logLabel: string,
  options?: { maxOutputTokens?: number; thinkingBudget?: number },
) {
  try {
    const exercises = await generateExercisesForLesson(
      course,
      manifest,
      lesson,
      lessonContent,
      options,
    )

    return exercises.length
  } catch (err) {
    console.error(
      `[learning-service] ${logLabel}:`,
      err instanceof Error ? err.message : err,
    )
    return 0
  }
}

async function createCourseLessons(
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

  const ai = getAI()
  const cachedResearch = await getCachedResearch(description, context)
  const researchMaterials = cachedResearch ?? await ai.research({ description, context })

  if (!cachedResearch) {
    await cacheResearch(description, context, researchMaterials)
  }

  const plan = await ai.planCourse({
    description,
    researchMaterials,
    context,
    globalMemory: user.globalMemory,
  }, {
    maxOutputTokens: 32768,
    thinkingBudget: 16384,
  })

  const enhancedTitles = await ai.enhanceTitles({
    courseTitle: plan.title,
    lessons: plan.lessons.map((lesson, index) => ({
      number: lesson.number || index + 1,
      title: lesson.title,
    })),
  })

  const slug = await courseService.ensureUniqueSlug(
    userId,
    sanitizeSlug(plan.slug || plan.title),
  )

  let courseId: string | null = null

  try {
    const course = await courseQueries.insert({
      userId,
      slug,
      title: plan.title,
      description: plan.description,
      context: context ?? '',
      memory: ai.prompts.courseMemory(plan.title),
      generationStatus: 'running',
    })
    courseId = course.id

    const lessonRows = await createCourseLessons(course.id, plan.lessons, enhancedTitles)
    await seedMastery(course.id, lessonRows)

    const firstLesson = lessonRows.find((lesson) => lesson.number === 1) ?? lessonRows[0]
    if (!firstLesson) {
      throw new Error('Generated course plan contained no lessons')
    }

    const rawContent = await ai.generateInitialLessonContent({
      description,
      researchMaterials,
      context: context ?? null,
      globalMemory: user.globalMemory,
      coursePlan: {
        title: plan.title,
        description: plan.description,
        lessons: toCoursePlanLessons(lessonRows),
      },
      lessonNumber: firstLesson.number,
      lessonTitle: firstLesson.title,
      concepts: firstLesson.concepts,
    }, {
      maxOutputTokens: 65536,
      thinkingBudget: 32768,
    })

    const reviewedContent = await ai.reviewContent(
      { content: rawContent },
      { thinkingBudget: 10000 },
    )
    const content = await imageService.processMarkdownVisuals(reviewedContent, course.id, slug)
    await lessonQueries.updateContent(firstLesson.id, content)
    const { manifest } = await loadCourseContext(course.id)

    await generateExercisesBestEffort(
      course,
      manifest,
      firstLesson,
      content,
      'initial exercise generation failed',
      {
        maxOutputTokens: 32768,
        thinkingBudget: 10000,
      },
    )

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
  const { course, manifest, lesson, user } = await loadGenerationContext(courseId, lessonNumber)
  const ai = getAI()

  await lessonQueries.updateGenerationStatus(lesson.id, 'running', null)

  try {
    const rawContent = await ai.generateLessonContent({
      manifest,
      globalMemory: user.globalMemory,
      courseMemory: course.memory,
      courseContext: course.context,
      lessonNumber,
    }, {
      webSearch: true,
    })

    const reviewedContent = await ai.reviewContent(
      { content: rawContent },
      { thinkingBudget: 10000 },
    )
    const content = await imageService.processMarkdownVisuals(
      reviewedContent,
      course.id,
      course.slug,
    )
    await lessonQueries.updateContent(lesson.id, content)
    const exerciseCount = await generateExercisesBestEffort(
      course,
      manifest,
      lesson,
      content,
      'exercise generation failed',
    )
    await lessonQueries.updateGenerationStatus(lesson.id, 'completed', null)

    return {
      lessonNumber,
      exerciseCount,
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

  const exercises = await generateExercisesForLesson(course, manifest, lesson, lesson.content)

  return {
    lessonNumber,
    exerciseCount: exercises.length,
  }
}

export async function getNextNotCreatedLesson(courseId: string) {
  const lessons = await lessonQueries.listByCourse(courseId)
  return lessons.find((lesson) => lesson.status === 'not_created') ?? null
}
