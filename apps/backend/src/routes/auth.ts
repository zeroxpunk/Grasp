import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { createDesktopAuthCodeResolver } from '../auth/desktop-code-resolver'
import * as sessionService from '../auth/session-service'
import { requireNonEmptyString } from '../utils/validation'

const app = new Hono<AppEnv>()

async function readBody<T>(c: Context<AppEnv>): Promise<T | null> {
  try {
    return await c.req.json<T>()
  } catch {
    return null
  }
}

app.post('/desktop/session/exchange', async (c) => {
  const body = await readBody<{ code?: string; deviceInfo?: string }>(c)
  const code = requireNonEmptyString(body?.code)
  if (!code) {
    return c.json({ error: 'code is required' }, 400)
  }

  const resolver = createDesktopAuthCodeResolver()
  if (!resolver) {
    return c.json({ error: 'Desktop auth exchange is not configured yet' }, 501)
  }

  const identity = await resolver.exchangeCode(code)
  if (!identity) {
    return c.json({ error: 'Invalid or expired auth code' }, 401)
  }

  const session = await sessionService.createSession(identity, {
    deviceInfo: requireNonEmptyString(body?.deviceInfo),
  })

  return c.json(session)
})

app.post('/desktop/session/refresh', async (c) => {
  const body = await readBody<{ refreshToken?: string; deviceInfo?: string }>(c)
  const refreshToken = requireNonEmptyString(body?.refreshToken)
  if (!refreshToken) {
    return c.json({ error: 'refreshToken is required' }, 400)
  }

  const session = await sessionService.refreshSession(refreshToken, {
    deviceInfo: requireNonEmptyString(body?.deviceInfo),
  })
  if (!session) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }

  return c.json(session)
})

app.post('/desktop/session/logout', async (c) => {
  const body = await readBody<{ refreshToken?: string }>(c)
  const authHeader = c.req.header('Authorization')
  const accessToken = authHeader?.startsWith('Bearer ')
    ? requireNonEmptyString(authHeader.slice(7))
    : null
  const refreshToken = requireNonEmptyString(body?.refreshToken)

  if (!accessToken && !refreshToken) {
    return c.json({ error: 'Authorization bearer token or refreshToken is required' }, 400)
  }

  if (accessToken) {
    await sessionService.revokeAccessToken(accessToken)
  }

  if (refreshToken) {
    await sessionService.revokeRefreshToken(refreshToken)
  }

  return c.json({ ok: true })
})

export default app
