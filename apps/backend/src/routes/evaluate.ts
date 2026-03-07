import { Hono } from 'hono'
import { userQueries } from '@grasp/db'
import type { AppEnv } from '../types'
import { getAI } from '../services/ai-service'
import * as courseService from '../services/course-service'
import * as evaluationService from '../services/evaluation-service'
import * as exerciseService from '../services/exercise-service'
import * as jobService from '../services/job-service'
import { queueJob } from '../services/job-runner'
import * as learningService from '../services/learning-service'
import * as lessonService from '../services/lesson-service'
import {
  isPositiveInteger,
  requireNonEmptyString,
} from '../utils/validation'

const app = new Hono<AppEnv>()

interface EvaluateBody {
  courseSlug?: unknown
  lessonNumber?: unknown
  conversationSummary?: unknown
}

type ExerciseAttempt = { exerciseId: number; completed: boolean }

function parseEvaluateBody(body: EvaluateBody) {
  const courseSlug = requireNonEmptyString(body.courseSlug)
  if (!courseSlug) {
    return { error: { message: 'courseSlug string is required', status: 400 as const } }
  }
  if (!isPositiveInteger(body.lessonNumber)) {
    return { error: { message: 'lessonNumber (number) is required', status: 400 as const } }
  }
  const conversationSummary = requireNonEmptyString(body.conversationSummary)
  if (!conversationSummary) {
    return { error: { message: 'conversationSummary string is required', status: 400 as const } }
  }

  return {
    courseSlug,
    lessonNumber: body.lessonNumber,
    conversationSummary,
  }
}

async function applyExerciseAttempts(
  lessonId: string,
  userId: string,
  attempts: ExerciseAttempt[],
) {
  await Promise.all(attempts.map((attempt) =>
    exerciseService.updateProgress(
      lessonId,
      attempt.exerciseId,
      userId,
      attempt.completed ? 'completed' : 'attempted',
    ),
  ))
}

async function queueNextLessonIfNeeded(
  userId: string,
  courseId: string,
  courseSlug: string,
) {
  const nextLesson = await learningService.getNextNotCreatedLesson(courseId)
  if (!nextLesson) return

  const job = await jobService.createJob({
    userId,
    type: 'lesson_generation',
    payload: { courseSlug, lessonNumber: nextLesson.number },
    courseId,
    lessonId: nextLesson.id,
  })
  queueJob(job.id)
}

app.post('/', async (c) => {
  const user = c.get('user')
  const parsed = parseEvaluateBody(await c.req.json<EvaluateBody>())
  if (parsed.error) return c.json({ error: parsed.error.message }, parsed.error.status)

  const [course, manifest, userProfile] = await Promise.all([
    courseService.getCourseBySlug(user.id, parsed.courseSlug),
    courseService.getCourseManifest(user.id, parsed.courseSlug),
    userQueries.findById(user.id),
  ])

  if (!course || !manifest) return c.json({ error: 'Course not found' }, 404)
  if (!userProfile) return c.json({ error: 'User not found' }, 404)

  const lesson = await lessonService.getLessonByNumber(course.id, parsed.lessonNumber)
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  const [exercises, exerciseProgress] = await Promise.all([
    exerciseService.listExercises(lesson.id),
    exerciseService.getProgressMap(lesson.id, user.id),
  ])

  const evaluation = await getAI().evaluate({
    manifest,
    globalMemory: userProfile.globalMemory,
    courseMemory: course.memory,
    exercises,
    exerciseProgress,
    conversationSummary: parsed.conversationSummary,
    lessonNumber: parsed.lessonNumber,
  })

  const exerciseIds = new Set(exercises.map((exercise) => exercise.id))
  const attemptedInChat: ExerciseAttempt[] = (evaluation.exercisesAttempted ?? [])
    .filter((attempt: ExerciseAttempt) => exerciseIds.has(attempt.exerciseId))

  await applyExerciseAttempts(lesson.id, user.id, attemptedInChat)

  const refreshedProgress = await exerciseService.getProgressMap(lesson.id, user.id)
  const allExercisesAttempted = exercises.length === 0
    || exercises.every((exercise) => refreshedProgress[exercise.id] !== undefined)
  const finalLessonComplete = evaluation.lessonComplete && allExercisesAttempted

  await evaluationService.applyEvaluation({
    courseId: course.id,
    lessonNumber: parsed.lessonNumber,
    masteryUpdates: evaluation.masteryUpdates,
    insightEntries: evaluation.insights,
    lessonComplete: finalLessonComplete,
  })
  await courseService.appendInsightsToCourseMemory(course.id, evaluation.insights)
  await evaluationService.applyPlanChanges(course.id, evaluation.planChanges)

  if (finalLessonComplete) {
    await queueNextLessonIfNeeded(user.id, course.id, course.slug)
  }

  return c.json({
    ok: true,
    evaluation: {
      ...evaluation,
      lessonComplete: finalLessonComplete,
    },
  })
})

export default app
