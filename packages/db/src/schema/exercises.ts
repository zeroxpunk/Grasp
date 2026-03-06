import { pgTable, text, timestamp, integer, jsonb, unique, uuid } from 'drizzle-orm/pg-core'
import { lessons } from './lessons.js'

export const exercises = pgTable('exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  exerciseNumber: integer('exercise_number').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  data: jsonb('data').notNull().$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('exercises_lesson_number_unique').on(t.lessonId, t.exerciseNumber),
])
