import { pgTable, text, timestamp, unique, customType, uuid } from 'drizzle-orm/pg-core'
import { courses } from './courses.js'

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const imageBlobs = pgTable('image_blobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull(),
  description: text('description').notNull(),
  data: bytea('data'),
  mediaType: text('media_type').notNull().default('image/png'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('image_blobs_course_hash_unique').on(t.courseId, t.hash),
])
