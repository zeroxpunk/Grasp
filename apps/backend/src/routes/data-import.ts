import { Hono } from 'hono'
import type { AppEnv } from '../types.js'
import { courseQueries, lessonQueries, masteryQueries } from '@grasp/db'
import { normalizeExercises } from '@grasp/ai'
import * as courseService from '../services/course-service.js'
import * as exerciseService from '../services/exercise-service.js'
import { createCourseLessons } from '../services/learning-service.js'
import { requireNonEmptyString } from '../utils/validation.js'
import { parsePositiveInteger } from '../utils/validation.js'

const app = new Hono<AppEnv>()

interface ImportCourseBody {
  title: string
  description: string
  context: string
  memory: string
  lessons: Array<{
    number: number
    title: string
    slug: string
    concepts: string[]
  }>
}

app.post('/courses', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<ImportCourseBody>()

  const title = requireNonEmptyString(body.title)
  if (!title) return c.json({ error: 'title is required' }, 400)
  if (!body.lessons?.length) return c.json({ error: 'lessons are required' }, 400)

  const baseSlug = body.lessons[0]?.slug
    ? body.title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : 'course'
  const slug = await courseService.ensureUniqueSlug(user.id, baseSlug)

  const course = await courseQueries.insert({
    userId: user.id,
    slug,
    title,
    description: body.description || '',
    context: body.context || '',
    memory: body.memory || '',
    generationStatus: 'completed',
  })

  const enhancedTitles = body.lessons.map((l) => l.title)
  const lessonRows = await createCourseLessons(course.id, body.lessons, enhancedTitles)

  const concepts = new Set<string>()
  for (const lesson of lessonRows) {
    for (const concept of lesson.concepts) {
      concepts.add(concept)
    }
  }
  await Promise.all(
    [...concepts].map((concept) => masteryQueries.upsert(course.id, concept, 0)),
  )

  return c.json({ courseSlug: course.slug }, 201)
})

app.put('/courses/:slug/lessons/:number/content', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')
  const number = parsePositiveInteger(c.req.param('number'))
  if (!number) return c.json({ error: 'Invalid lesson number' }, 400)

  const course = await courseService.getCourseBySlug(user.id, slug)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  const lesson = await lessonQueries.findByCourseAndNumber(course.id, number)
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  const body = await c.req.json<{ content: string }>()
  const content = requireNonEmptyString(body.content)
  if (!content) return c.json({ error: 'content is required' }, 400)

  await lessonQueries.updateContent(lesson.id, content)
  await lessonQueries.updateGenerationStatus(lesson.id, 'completed', null)

  return c.json({ ok: true })
})

app.put('/courses/:slug/lessons/:number/exercises', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')
  const number = parsePositiveInteger(c.req.param('number'))
  if (!number) return c.json({ error: 'Invalid lesson number' }, 400)

  const course = await courseService.getCourseBySlug(user.id, slug)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  const lesson = await lessonQueries.findByCourseAndNumber(course.id, number)
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  const body = await c.req.json<{ exercises: Record<string, unknown>[] }>()
  if (!body.exercises?.length) return c.json({ error: 'exercises are required' }, 400)

  const exercises = normalizeExercises(body.exercises)
  await exerciseService.replaceExercises(lesson.id, exercises)

  return c.json({ ok: true })
})

export default app
