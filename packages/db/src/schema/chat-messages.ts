import { pgTable, text, timestamp, integer, unique, uuid } from 'drizzle-orm/pg-core'
import { lessons } from './lessons.js'
import { users } from './users.js'
import { exercises } from './exercises.js'

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  exerciseId: uuid('exercise_id').references(() => exercises.id, { onDelete: 'set null' }),
  seq: integer('seq').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('chat_messages_lesson_user_seq_unique').on(t.lessonId, t.userId, t.seq),
])
