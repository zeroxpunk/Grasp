import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const researchCache = pgTable('research_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  cacheKey: text('cache_key').notNull().unique(),
  results: text('results').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
