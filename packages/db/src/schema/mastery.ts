import { pgTable, text, timestamp, integer, unique, uuid } from 'drizzle-orm/pg-core'
import { courses } from './courses.js'

export const mastery = pgTable('mastery', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  concept: text('concept').notNull(),
  level: integer('level').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('mastery_course_concept_unique').on(t.courseId, t.concept),
])
