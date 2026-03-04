import crypto from 'node:crypto'
import { researchCacheQueries } from '@grasp/db'

function cacheKey(description: string, context?: string) {
  return crypto.createHash('md5').update(description + (context ?? '')).digest('hex')
}

export async function getCachedResearch(description: string, context?: string) {
  const cached = await researchCacheQueries.findByKey(cacheKey(description, context))
  return cached?.results ?? null
}

export async function cacheResearch(description: string, context: string | undefined, results: string) {
  await researchCacheQueries.upsert(cacheKey(description, context), results)
}
