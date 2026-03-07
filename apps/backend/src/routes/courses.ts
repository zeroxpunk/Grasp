import { Hono } from 'hono'
import type { AppEnv } from '../types'
import * as courseService from '../services/course-service'
import * as jobService from '../services/job-service'
import { queueJob } from '../services/job-runner'
import { requireNonEmptyString } from '../utils/validation'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const user = c.get('user')
  const courses = await courseService.listCourses(user.id)
  return c.json(courses)
})

app.get('/:slug', async (c) => {
  const user = c.get('user')
  const manifest = await courseService.getCourseManifest(user.id, c.req.param('slug'))
  if (!manifest) return c.json({ error: 'Course not found' }, 404)
  return c.json(manifest)
})

app.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ description: string; context?: string }>()
  const description = requireNonEmptyString(body.description)
  if (!description) {
    return c.json({ error: 'description is required' }, 400)
  }

  const job = await jobService.createJob({
    userId: user.id,
    type: 'course_creation',
    payload: {
      description,
      context: requireNonEmptyString(body.context) ?? '',
    },
  })
  queueJob(job.id)

  return c.json({ jobId: job.id }, 201)
})

app.delete('/:slug', async (c) => {
  const user = c.get('user')
  const deleted = await courseService.deleteCourse(user.id, c.req.param('slug'))
  if (!deleted) return c.json({ error: 'Course not found' }, 404)
  return c.json({ ok: true })
})

export default app
