import type { ErrorHandler } from 'hono'
import type { AppEnv } from '../types'

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err)

  if ('body' in err) {
    return c.json({ error: 'Invalid JSON in request body' }, 400)
  }

  if ('status' in err) {
    const status = (err as { status: number }).status
    if (status >= 400 && status < 600) {
      return c.json({ error: err.message }, status as 400)
    }
  }

  return c.json(
    { error: 'Internal server error' },
    500,
  )
}
