import { Hono } from 'hono'
import type { AppEnv } from '../types.js'
import * as userService from '../services/user-service.js'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const profile = await userService.getProfile(c.get('user').id)
  if (!profile) return c.json({ error: 'User not found' }, 404)
  return c.json(profile)
})

app.patch('/', async (c) => {
  const body = await c.req.json<{ displayName?: string; globalMemory?: string }>()
  return c.json(await userService.updateProfile(c.get('user').id, body))
})

export default app
