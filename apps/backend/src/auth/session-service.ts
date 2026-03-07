import { authSessionQueries, userQueries } from '@grasp/db'
import { authConfig } from './config'
import type { AuthIdentity, AuthUser } from './types'
import { toAuthUser } from './user-mapper'
import { createToken, hashToken } from '../utils/tokens'

type AuthSessionResponse = {
  token: string
  refreshToken: string
  expiresAt: string
  refreshExpiresAt: string
  user: AuthUser
}

function createExpiryDates() {
  const now = Date.now()

  return {
    accessTokenExpiresAt: new Date(now + authConfig.accessTokenTtlSeconds * 1000),
    refreshTokenExpiresAt: new Date(now + authConfig.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
  }
}

function buildSessionResponse(params: {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
  user: AuthUser
}): AuthSessionResponse {
  return {
    token: params.accessToken,
    refreshToken: params.refreshToken,
    expiresAt: params.accessTokenExpiresAt.toISOString(),
    refreshExpiresAt: params.refreshTokenExpiresAt.toISOString(),
    user: params.user,
  }
}

export async function createSession(identity: AuthIdentity, options?: {
  deviceInfo?: string | null
}) {
  const user = await userQueries.upsertFromAuthIdentity({
    email: identity.email,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    authProvider: identity.provider,
    authProviderId: identity.providerId,
  })

  const accessToken = createToken('grasp_at_')
  const refreshToken = createToken('grasp_rt_')
  const { accessTokenExpiresAt, refreshTokenExpiresAt } = createExpiryDates()
  const lastUsedAt = new Date()

  await authSessionQueries.insert({
    userId: user.id,
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    deviceInfo: options?.deviceInfo ?? null,
    lastUsedAt,
  })

  return buildSessionResponse({
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    user: toAuthUser(user),
  })
}

export async function refreshSession(refreshToken: string, options?: {
  deviceInfo?: string | null
}) {
  const session = await authSessionQueries.findActiveByRefreshTokenHash(hashToken(refreshToken))
  if (!session) {
    return null
  }

  const user = await userQueries.findById(session.userId)
  if (!user) {
    await authSessionQueries.revokeById(session.id)
    return null
  }

  const nextAccessToken = createToken('grasp_at_')
  const nextRefreshToken = createToken('grasp_rt_')
  const { accessTokenExpiresAt, refreshTokenExpiresAt } = createExpiryDates()
  const lastUsedAt = new Date()

  await authSessionQueries.rotate(session.id, {
    accessTokenHash: hashToken(nextAccessToken),
    refreshTokenHash: hashToken(nextRefreshToken),
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    deviceInfo: options?.deviceInfo ?? session.deviceInfo,
    lastUsedAt,
  })

  return buildSessionResponse({
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    user: toAuthUser(user),
  })
}

export async function revokeAccessToken(accessToken: string) {
  await authSessionQueries.revokeByAccessTokenHash(hashToken(accessToken))
}

export async function revokeRefreshToken(refreshToken: string) {
  await authSessionQueries.revokeByRefreshTokenHash(hashToken(refreshToken))
}
