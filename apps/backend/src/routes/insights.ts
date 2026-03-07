import { Hono } from 'hono'
import type { AppEnv } from '../types'
import * as courseService from '../services/course-service'
import * as insightService from '../services/insight-service'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')!

  const course = await courseService.getCourseBySlug(user.id, slug)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  return c.json(await insightService.listInsights(course.id))
})

export default app
