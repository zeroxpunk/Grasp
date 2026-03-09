import { pgTable, text, timestamp, unique, uuid, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  context: text('context').notNull().default(''),
  memory: text('memory').notNull().default(''),
  generationStatus: text('generation_status').notNull().default('completed'),
  language: text('language'),
  generationError: text('generation_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('courses_user_slug_unique').on(t.userId, t.slug),
  index('courses_user_id_idx').on(t.userId),
])
