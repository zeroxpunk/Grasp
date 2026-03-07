import { pgTable, text, timestamp, jsonb, index, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'
import { courses } from './courses'
import { lessons } from './lessons'

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  status: text('status').notNull().default('pending'),
  payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
  result: jsonb('result').$type<Record<string, unknown>>(),
  error: text('error'),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('jobs_user_status_idx').on(t.userId, t.status),
  index('jobs_course_id_idx').on(t.courseId),
  index('jobs_lesson_id_idx').on(t.lessonId),
])
