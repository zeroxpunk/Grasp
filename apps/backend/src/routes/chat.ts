import { streamEventsToSSE } from '@grasp/ai'
import { userQueries } from '@grasp/db'
import { Hono } from 'hono'
import type { AppEnv } from '../types.js'
import * as courseService from '../services/course-service.js'
import * as chatService from '../services/chat-service.js'
import * as exerciseService from '../services/exercise-service.js'
import * as lessonService from '../services/lesson-service.js'
import { getAI } from '../services/ai-service.js'
import {
  isPositiveInteger,
  parsePositiveInteger,
  requireNonEmptyString,
} from '../utils/validation.js'

const app = new Hono<AppEnv>()

function isChatInputMessage(value: unknown): value is chatService.ChatInputMessage {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const role = candidate.role
  const content = candidate.content
  const exerciseId = candidate.exerciseId

  return (role === 'user' || role === 'assistant')
    && typeof content === 'string'
    && (exerciseId === undefined || exerciseId === null || isPositiveInteger(exerciseId))
}

async function loadCourseAndLessonState(userId: string, slug: string, lessonNumber: number) {
  const course = await courseService.getCourseBySlug(userId, slug)
  if (!course) {
    return { error: { message: 'Course not found', status: 404 as const } }
  }

  const [manifest, lesson, userProfile] = await Promise.all([
    courseService.getCourseManifest(userId, slug),
    lessonService.getLessonByNumber(course.id, lessonNumber),
    userQueries.findById(userId),
  ])

  if (!manifest) {
    return { error: { message: 'Course manifest not found', status: 404 as const } }
  }
  if (!lesson) {
    return { error: { message: 'Lesson not found', status: 404 as const } }
  }
  if (!userProfile) {
    return { error: { message: 'User not found', status: 404 as const } }
  }

  return { course, manifest, lesson, userProfile }
}

async function loadCourseState(userId: string, slug: string) {
  const course = await courseService.getCourseBySlug(userId, slug)
  if (!course) {
    return { error: { message: 'Course not found', status: 404 as const } }
  }

  return { course }
}

async function buildStreamingMessages(
  courseId: string,
  lessonNumber: number,
  userId: string,
  body: { messages?: unknown; message?: unknown; exerciseId?: unknown },
): Promise<chatService.ChatInputMessage[] | { error: { message: string; status: 400 | 404 } }> {
  if (Array.isArray(body.messages) && body.messages.every(isChatInputMessage)) {
    return body.messages
  }

  const message = requireNonEmptyString(body.message)
  if (!message) {
    return { error: { message: 'messages array or message string is required', status: 400 } }
  }

  const history = await chatService.getChatHistory(courseId, lessonNumber, userId)
  if (history === null) {
    return { error: { message: 'Lesson not found', status: 404 } }
  }

  return [
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
      exerciseId: message.exerciseId,
    })),
    {
      role: 'user',
      content: message,
      exerciseId: isPositiveInteger(body.exerciseId) ? body.exerciseId : null,
    },
  ]
}

app.get('/', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')!
  const number = parsePositiveInteger(c.req.param('number')!)
  if (!number) return c.json({ error: 'Invalid lesson number' }, 400)

  const state = await loadCourseState(user.id, slug)
  if (state.error) return c.json({ error: state.error.message }, state.error.status)

  const messages = await chatService.getChatHistory(state.course.id, number, user.id)
  if (!messages) return c.json({ error: 'Lesson not found' }, 404)

  return c.json(messages)
})

app.post('/', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')!
  const number = parsePositiveInteger(c.req.param('number')!)
  if (!number) return c.json({ error: 'Invalid lesson number' }, 400)

  const state = await loadCourseState(user.id, slug)
  if (state.error) return c.json({ error: state.error.message }, state.error.status)

  const body = await c.req.json<{ messages?: unknown }>()
  if (!Array.isArray(body.messages) || !body.messages.every(isChatInputMessage)) {
    return c.json({ error: 'messages array is required' }, 400)
  }

  const result = await chatService.saveChatHistory(state.course.id, number, user.id, body.messages)
  if (!result) return c.json({ error: 'Lesson not found' }, 404)

  return c.json(result)
})

app.post('/stream', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')!
  const lessonNumber = parsePositiveInteger(c.req.param('number')!)
  if (!lessonNumber) return c.json({ error: 'Invalid lesson number' }, 400)

  const state = await loadCourseAndLessonState(user.id, slug, lessonNumber)
  if (state.error) return c.json({ error: state.error.message }, state.error.status)

  const { course, manifest, lesson, userProfile } = state
  if (!lesson.content) return c.json({ error: 'Lesson content not generated yet' }, 409)

  const body = await c.req.json<{
    messages?: unknown
    message?: unknown
    exerciseId?: unknown
  }>()

  const messages = await buildStreamingMessages(course.id, lessonNumber, user.id, body)
  if (!Array.isArray(messages)) return c.json({ error: messages.error.message }, messages.error.status)

  const [exercises, exerciseProgress] = await Promise.all([
    exerciseService.listExercises(lesson.id),
    exerciseService.getProgressMap(lesson.id, user.id),
  ])

  const events = getAI().tutor.stream({
    manifest,
    globalMemory: userProfile.globalMemory,
    courseContext: course.context,
    courseMemory: course.memory,
    lessonContent: lesson.content,
    lessonTitle: lesson.title,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    exercises,
    exerciseProgress,
  }, {
    onExerciseStatus: async (exerciseId: number, status: 'attempted' | 'completed') => {
      await exerciseService.updateProgress(lesson.id, exerciseId, user.id, status)
    },
  })

  return new Response(streamEventsToSSE(events), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})

export default app
