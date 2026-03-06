import {
  runCourseCreationPipeline,
  runLessonGenerationPipeline,
  runExerciseGenerationPipeline,
} from '@grasp/ai'
import type { GraspClient } from '@grasp/api-client'
import { getLocalAI } from './local-ai'

export async function createCourse(
  apiClient: GraspClient,
  params: { description: string; context?: string },
  onProgress?: (step: string) => void,
) {
  const ai = getLocalAI()
  const user = await apiClient.user.me()

  const result = await runCourseCreationPipeline(ai, {
    description: params.description,
    context: params.context,
    globalMemory: user.globalMemory,
  }, onProgress)

  const { courseSlug } = await apiClient.import.course({
    title: result.plan.title,
    description: result.plan.description,
    context: params.context ?? '',
    memory: result.courseMemory,
    lessons: result.plan.lessons.map((l, i) => ({
      ...l,
      title: result.enhancedTitles[i] || l.title,
    })),
  })

  await apiClient.import.lessonContent(courseSlug, 1, result.firstLessonContent)

  if (result.firstLessonExercises.length > 0) {
    await apiClient.import.lessonExercises(
      courseSlug,
      1,
      result.firstLessonExercises as unknown as unknown[],
    )
  }

  return { slug: courseSlug }
}

export async function generateLesson(
  apiClient: GraspClient,
  params: { courseSlug: string; lessonNumber: number },
  onProgress?: (step: string) => void,
) {
  const ai = getLocalAI()
  const manifest = await apiClient.courses.get(params.courseSlug)
  const user = await apiClient.user.me()

  const result = await runLessonGenerationPipeline(ai, {
    manifest: {
      slug: manifest.slug,
      title: manifest.title,
      description: manifest.description,
      createdAt: manifest.createdAt,
      lessons: manifest.lessons.map((l) => ({
        ...l,
        status: l.status as 'not_created' | 'not_started' | 'started' | 'completed' | 'failed',
      })),
      mastery: manifest.mastery,
    },
    globalMemory: user.globalMemory,
    courseMemory: '', // not available via API client
    courseContext: '',
    lessonNumber: params.lessonNumber,
  }, onProgress)

  await apiClient.import.lessonContent(params.courseSlug, params.lessonNumber, result.content)

  if (result.exercises.length > 0) {
    await apiClient.import.lessonExercises(
      params.courseSlug,
      params.lessonNumber,
      result.exercises as unknown as unknown[],
    )
  }

  return { lessonNumber: params.lessonNumber, exerciseCount: result.exercises.length }
}

export async function regenerateExercises(
  apiClient: GraspClient,
  params: { courseSlug: string; lessonNumber: number },
) {
  const ai = getLocalAI()
  const manifest = await apiClient.courses.get(params.courseSlug)
  const lessonDetail = await apiClient.lessons.get(params.courseSlug, params.lessonNumber)

  if (!lessonDetail.content) {
    throw new Error('Lesson content has not been generated yet')
  }

  const lesson = manifest.lessons.find((l) => l.number === params.lessonNumber)
  if (!lesson) {
    throw new Error('Lesson not found in manifest')
  }

  const exercises = await runExerciseGenerationPipeline(ai, {
    manifest: {
      slug: manifest.slug,
      title: manifest.title,
      description: manifest.description,
      createdAt: manifest.createdAt,
      lessons: manifest.lessons.map((l) => ({
        ...l,
        status: l.status as 'not_created' | 'not_started' | 'started' | 'completed' | 'failed',
      })),
      mastery: manifest.mastery,
    },
    courseMemory: '',
    lessonNumber: params.lessonNumber,
    lessonTitle: lesson.title,
    concepts: lesson.concepts,
    lessonContent: lessonDetail.content,
  })

  await apiClient.import.lessonExercises(
    params.courseSlug,
    params.lessonNumber,
    exercises as unknown as unknown[],
  )

  return { lessonNumber: params.lessonNumber, exerciseCount: exercises.length }
}
