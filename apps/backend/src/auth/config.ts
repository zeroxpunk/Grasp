import { parsePositiveIntegerOr, requireNonEmptyString } from '../utils/validation'

export type AuthProviderMode = 'dev' | 'session'

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 30
const DEFAULT_DESKTOP_AUTH_DEV_CODE = 'grasp-dev-login'

function resolveAuthProviderMode(): AuthProviderMode {
  const mode = process.env.AUTH_PROVIDER_MODE?.trim()
  if (mode === 'dev' || mode === 'session') {
    return mode
  }

  return process.env.NODE_ENV === 'production' ? 'session' : 'dev'
}

export const authConfig = {
  providerMode: resolveAuthProviderMode(),
  accessTokenTtlSeconds: parsePositiveIntegerOr(
    process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  ),
  refreshTokenTtlDays: parsePositiveIntegerOr(
    process.env.AUTH_REFRESH_TOKEN_TTL_DAYS,
    DEFAULT_REFRESH_TOKEN_TTL_DAYS,
  ),
  devDesktopAuthCode: requireNonEmptyString(process.env.DESKTOP_AUTH_DEV_CODE) || DEFAULT_DESKTOP_AUTH_DEV_CODE,
  google: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    desktopRedirectUri: process.env.GOOGLE_OAUTH_DESKTOP_REDIRECT_URI || 'grasp://auth/callback',
  },
}
