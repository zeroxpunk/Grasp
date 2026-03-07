import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core'
import { courses } from './courses'

export const insights = pgTable('insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  observation: text('observation').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('insights_course_id_idx').on(t.courseId),
])
