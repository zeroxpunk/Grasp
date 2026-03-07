import type { AuthUser } from './auth/types'

export type AppEnv = {
  Variables: {
    user: AuthUser
  }
}
