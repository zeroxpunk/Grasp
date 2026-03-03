import { Hono } from 'hono'
import type { AppEnv } from '../types.js'
import * as courseService from '../services/course-service.js'
import * as lessonService from '../services/lesson-service.js'
import * as exerciseService from '../services/exercise-service.js'
import * as jobService from '../services/job-service.js'
import { queueJob } from '../services/job-runner.js'
import { parsePositiveInteger } from '../utils/validation.js'

const app = new Hono<AppEnv>()

app.post('/regenerate', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')!
  const number = parsePositiveInteger(c.req.param('number')!)
  if (!number) return c.json({ error: 'Invalid lesson number' }, 400)

  const course = await courseService.getCourseBySlug(user.id, slug)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  const lesson = await lessonService.getLessonByNumber(course.id, number)
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  const job = await jobService.createJob({
    userId: user.id,
    type: 'exercise_regeneration',
    payload: { courseSlug: slug, lessonNumber: number },
    courseId: course.id,
    lessonId: lesson.id,
  })
  queueJob(job.id)

  return c.json({ jobId: job.id }, 201)
})

app.post('/:num/progress', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')!
  const lessonNumber = parsePositiveInteger(c.req.param('number')!)
  const exerciseNumber = parsePositiveInteger(c.req.param('num')!)
  if (!lessonNumber || !exerciseNumber) return c.json({ error: 'Invalid number' }, 400)

  const course = await courseService.getCourseBySlug(user.id, slug)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  const lesson = await lessonService.getLessonByNumber(course.id, lessonNumber)
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  const body = await c.req.json<{ status: 'attempted' | 'completed' }>()
  if (!body.status || !['attempted', 'completed'].includes(body.status)) {
    return c.json({ error: 'Invalid status' }, 400)
  }

  const result = await exerciseService.updateProgress(lesson.id, exerciseNumber, user.id, body.status)
  return c.json(result)
})

export default app
