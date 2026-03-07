import { Hono } from 'hono'
import type { AppEnv } from '../types'
import * as courseService from '../services/course-service'
import * as lessonService from '../services/lesson-service'
import * as jobService from '../services/job-service'
import { queueJob } from '../services/job-runner'
import { parsePositiveInteger } from '../utils/validation'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')!
  const number = parsePositiveInteger(c.req.param('number')!)
  if (!number) return c.json({ error: 'Invalid lesson number' }, 400)

  const course = await courseService.getCourseBySlug(user.id, slug)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  const lesson = await lessonService.getLessonDetail(course.id, number, user.id)
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  return c.json(lesson)
})

app.post('/generate', async (c) => {
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
    type: 'lesson_generation',
    payload: { courseSlug: slug, lessonNumber: number },
    courseId: course.id,
    lessonId: lesson.id,
  })
  queueJob(job.id)

  return c.json({ jobId: job.id }, 201)
})

export default app
