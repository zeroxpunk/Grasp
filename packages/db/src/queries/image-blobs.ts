import { eq, and } from 'drizzle-orm'
import { imageBlobs } from '../schema/image-blobs.js'
import { getDb } from '../client.js'

export function findByCourseAndHash(courseId: string, hash: string) {
  return getDb()
    .select()
    .from(imageBlobs)
    .where(and(eq(imageBlobs.courseId, courseId), eq(imageBlobs.hash, hash)))
    .limit(1)
    .then(r => r[0] ?? null)
}

export function upsert(data: {
  courseId: string
  hash: string
  description: string
  data: Buffer
  mediaType?: string
}) {
  return getDb()
    .insert(imageBlobs)
    .values(data)
    .onConflictDoUpdate({
      target: [imageBlobs.courseId, imageBlobs.hash],
      set: { data: data.data, description: data.description, mediaType: data.mediaType ?? 'image/png' },
    })
    .returning()
    .then(r => r[0]!)
}

export function ensurePlaceholder(data: {
  courseId: string
  hash: string
  description: string
  mediaType?: string
}) {
  return getDb()
    .insert(imageBlobs)
    .values({
      courseId: data.courseId,
      hash: data.hash,
      description: data.description,
      mediaType: data.mediaType ?? 'image/png',
    })
    .onConflictDoUpdate({
      target: [imageBlobs.courseId, imageBlobs.hash],
      set: {
        description: data.description,
        mediaType: data.mediaType ?? 'image/png',
      },
    })
    .returning()
    .then(r => r[0]!)
}
