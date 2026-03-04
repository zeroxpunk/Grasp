import crypto from 'node:crypto'
import { DEFAULT_DIAGRAM_IMAGE_MEDIA_TYPE } from '@grasp/ai'
import { imageBlobQueries } from '@grasp/db'
import { getAI } from './ai-service.js'

const VISUAL_REGEX = /\[DIAGRAM:\s*(.+?)\]/g
const FAILED_VISUAL_REGEX = /\*\[Visual:\s*(.+?)\]\*/g

export async function getImage(courseId: string, hash: string) {
  return imageBlobQueries.findByCourseAndHash(courseId, hash)
}

export async function storeImage(
  courseId: string,
  hash: string,
  description: string,
  data: Buffer,
  mediaType: string = DEFAULT_DIAGRAM_IMAGE_MEDIA_TYPE,
) {
  return imageBlobQueries.upsert({ courseId, hash, description, data, mediaType })
}

export async function ensureImagePlaceholder(
  courseId: string,
  hash: string,
  description: string,
  mediaType: string = DEFAULT_DIAGRAM_IMAGE_MEDIA_TYPE,
) {
  return imageBlobQueries.ensurePlaceholder({ courseId, hash, description, mediaType })
}

export async function generateVisual(
  description: string,
): Promise<{ bytes: Uint8Array; mediaType: string; alt: string } | null> {
  const image = await getAI().images.generateDiagram({ description })
  if (!image) return null

  return {
    bytes: image.bytes,
    mediaType: image.mediaType,
    alt: image.alt,
  }
}

export async function getOrGenerateImage(courseId: string, hash: string) {
  const existing = await getImage(courseId, hash)
  if (!existing) return null

  if (existing.data) {
    return {
      data: new Uint8Array(existing.data),
      mediaType: existing.mediaType,
      description: existing.description,
    }
  }

  const generated = await generateVisual(existing.description)
  if (!generated) return null

  await storeImage(
    courseId,
    hash,
    existing.description,
    Buffer.from(generated.bytes),
    generated.mediaType,
  )

  return {
    data: generated.bytes,
    mediaType: generated.mediaType,
    description: existing.description,
  }
}

export async function processMarkdownVisuals(
  markdown: string,
  courseId: string,
  courseSlug: string,
): Promise<string> {
  const normalized = markdown.replace(
    FAILED_VISUAL_REGEX,
    (_match, description: string) => `[DIAGRAM: ${description}]`,
  )

  const replacements = [...normalized.matchAll(VISUAL_REGEX)].map((match) => {
    const description = match[1]!.trim()
    const hash = crypto.createHash('md5').update(description).digest('hex').slice(0, 12)

    return {
      original: match[0],
      description,
      replacement: `![${description.replace(/[\[\]]/g, '')}](/api/v1/courses/${courseSlug}/images/${hash}.png)`,
      hash,
    }
  })

  if (replacements.length === 0) return markdown

  await Promise.all(
    replacements.map(({ hash, description }) =>
      ensureImagePlaceholder(courseId, hash, description),
    ),
  )

  let result = normalized
  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement)
  }

  return result
}
