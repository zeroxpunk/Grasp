import { pgTable, text, timestamp, unique, uuid, index } from 'drizzle-orm/pg-core'
import { exercises } from './exercises.js'
import { users } from './users.js'

export const exerciseProgress = pgTable('exercise_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('exercise_progress_exercise_user_unique').on(t.exerciseId, t.userId),
  index('exercise_progress_user_id_idx').on(t.userId),
])
