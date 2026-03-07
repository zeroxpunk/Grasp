import { Hono } from 'hono'
import type { AppEnv } from '../types'
import * as sessionService from '../services/session-service'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const user = c.get('user')
  return c.json(await sessionService.getSessionStats(user.id))
})

app.post('/start', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ courseSlug?: string }>().catch(() => ({} as { courseSlug?: string }))
  const session = await sessionService.startSession(user.id, body.courseSlug)

  return c.json({
    ok: true,
    session: {
      id: session.id,
      courseSlug: session.courseSlug,
      startedAt: session.startedAt.toISOString(),
      endedAt: null,
    },
  })
})

app.post('/end', async (c) => {
  const user = c.get('user')
  const session = await sessionService.endSession(user.id)

  return c.json({
    ok: true,
    session: {
      id: session.id,
      courseSlug: session.courseSlug,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
    },
  })
})

export default app
