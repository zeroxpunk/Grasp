import { pgTable, text, timestamp, integer, jsonb, unique, uuid } from 'drizzle-orm/pg-core'
import { courses } from './courses.js'

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  concepts: jsonb('concepts').notNull().$type<string[]>().default([]),
  status: text('status').notNull().default('not_created'),
  content: text('content'),
  generationStatus: text('generation_status'),
  generationError: text('generation_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('lessons_course_number_unique').on(t.courseId, t.number),
  unique('lessons_course_slug_unique').on(t.courseId, t.slug),
])
