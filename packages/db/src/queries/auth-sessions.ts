import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { getDb } from '../client.js'
import { authSessions } from '../schema/auth-sessions.js'

export function findActiveByAccessTokenHash(accessTokenHash: string) {
  return getDb()
    .select()
    .from(authSessions)
    .where(and(
      eq(authSessions.accessTokenHash, accessTokenHash),
      isNull(authSessions.revokedAt),
      gt(authSessions.accessTokenExpiresAt, new Date()),
    ))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export function findActiveByRefreshTokenHash(refreshTokenHash: string) {
  return getDb()
    .select()
    .from(authSessions)
    .where(and(
      eq(authSessions.refreshTokenHash, refreshTokenHash),
      isNull(authSessions.revokedAt),
      gt(authSessions.refreshTokenExpiresAt, new Date()),
    ))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export function listActiveByUser(userId: string, limit = 20) {
  return getDb()
    .select()
    .from(authSessions)
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)))
    .orderBy(desc(authSessions.createdAt))
    .limit(limit)
}

export function insert(data: {
  userId: string
  accessTokenHash: string
  refreshTokenHash: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
  deviceInfo?: string | null
  lastUsedAt?: Date | null
}) {
  return getDb()
    .insert(authSessions)
    .values({
      userId: data.userId,
      accessTokenHash: data.accessTokenHash,
      refreshTokenHash: data.refreshTokenHash,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
      refreshTokenExpiresAt: data.refreshTokenExpiresAt,
      deviceInfo: data.deviceInfo ?? null,
      lastUsedAt: data.lastUsedAt ?? null,
    })
    .returning()
    .then((rows) => rows[0]!)
}

export function rotate(id: string, data: {
  accessTokenHash: string
  refreshTokenHash: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
  deviceInfo?: string | null
  lastUsedAt?: Date | null
}) {
  return getDb()
    .update(authSessions)
    .set({
      accessTokenHash: data.accessTokenHash,
      refreshTokenHash: data.refreshTokenHash,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
      refreshTokenExpiresAt: data.refreshTokenExpiresAt,
      deviceInfo: data.deviceInfo ?? null,
      lastUsedAt: data.lastUsedAt ?? null,
      revokedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(authSessions.id, id))
}

export function revokeById(id: string) {
  return getDb()
    .update(authSessions)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(authSessions.id, id), isNull(authSessions.revokedAt)))
}

export function revokeByAccessTokenHash(accessTokenHash: string) {
  return getDb()
    .update(authSessions)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(authSessions.accessTokenHash, accessTokenHash), isNull(authSessions.revokedAt)))
}

export function revokeByRefreshTokenHash(refreshTokenHash: string) {
  return getDb()
    .update(authSessions)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(authSessions.refreshTokenHash, refreshTokenHash), isNull(authSessions.revokedAt)))
}
