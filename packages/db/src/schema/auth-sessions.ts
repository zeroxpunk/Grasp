import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessTokenHash: text('access_token_hash').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }).notNull(),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }).notNull(),
  deviceInfo: text('device_info'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('auth_sessions_access_token_hash_unique').on(t.accessTokenHash),
  uniqueIndex('auth_sessions_refresh_token_hash_unique').on(t.refreshTokenHash),
  index('auth_sessions_user_active_idx').on(t.userId).where(sql`revoked_at IS NULL`),
  index('auth_sessions_access_expires_at_idx').on(t.accessTokenExpiresAt),
  index('auth_sessions_refresh_expires_at_idx').on(t.refreshTokenExpiresAt),
])
