import type { MiddlewareHandler } from 'hono'
import type { AuthProvider } from '../auth/types'
import type { AppEnv } from '../types'

const PUBLIC_PATHS = new Set(['/', '/health'])

export function authMiddleware(provider: AuthProvider): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (PUBLIC_PATHS.has(c.req.path) || c.req.path === '/api/auth' || c.req.path.startsWith('/api/auth/')) {
      return next()
    }

    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401)
    }

    const token = authHeader.slice(7)
    const user = await provider.verify(token)
    if (!user) {
      return c.json({ error: 'Invalid token' }, 401)
    }

    c.set('user', user)
    return next()
  }
}
