import { Hono } from 'hono'
import type { AppEnv } from '../types'
import type { JobRow } from '../lib/db-types'
import * as jobService from '../services/job-service'

function serializeJob(job: JobRow) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    payload: job.payload,
    result: job.result,
    error: job.error,
    courseId: job.courseId,
    lessonId: job.lessonId,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  }
}

const app = new Hono<AppEnv>()

app.get('/:id', async (c) => {
  const user = c.get('user')
  const job = await jobService.getJob(c.req.param('id'))
  if (!job || job.userId !== user.id) return c.json({ error: 'Job not found' }, 404)
  return c.json(serializeJob(job))
})

app.get('/', async (c) => {
  const user = c.get('user')
  const jobs = await jobService.listUserJobs(user.id)
  return c.json(jobs.map(serializeJob))
})

export default app
