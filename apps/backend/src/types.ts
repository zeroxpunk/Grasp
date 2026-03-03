import type { AuthUser } from './auth/types.js'

export type AppEnv = {
  Variables: {
    user: AuthUser
  }
}
