import { eq } from 'drizzle-orm'
import { researchCache } from '../schema/research-cache'
import { getDb } from '../client'

const CACHE_TTL_MS = 60 * 60 * 1000

export function findByKey(cacheKey: string) {
  return getDb()
    .select()
    .from(researchCache)
    .where(eq(researchCache.cacheKey, cacheKey))
    .limit(1)
    .then(r => {
      const row = r[0] ?? null
      if (!row) return null
      if (Date.now() - row.createdAt.getTime() > CACHE_TTL_MS) return null
      return row
    })
}

export function upsert(cacheKey: string, results: string) {
  return getDb()
    .insert(researchCache)
    .values({ cacheKey, results })
    .onConflictDoUpdate({
      target: researchCache.cacheKey,
      set: { results, createdAt: new Date() },
    })
}
