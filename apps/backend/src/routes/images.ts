import { Hono } from 'hono'
import { courseQueries, lessonQueries } from '@grasp/db'
import type { AppEnv } from '../types'
import * as imageService from '../services/image-service'
import { requireNonEmptyString } from '../utils/validation'

const IMAGE_REF_REGEX = /!\[([^\]]*)\]\([^)]*?\/images\/([a-f0-9]+)\.png\)/g

const app = new Hono<AppEnv>()

// This route is public (auth middleware skips image paths) so <img> tags work without Bearer tokens
app.get('/', async (c) => {
  const slug = c.req.param('slug')!
  const hash = c.req.param('hash')!.replace(/\.png$/, '')

  const course = await courseQueries.findBySlug(slug)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  let image = await imageService.getOrGenerateImage(course.id, hash)

  // If no image record exists, try to recover the description from lesson content
  if (!image) {
    const description = await findImageDescription(course.id, hash)
    if (description) {
      await imageService.ensureImagePlaceholder(course.id, hash, description)
      image = await imageService.getOrGenerateImage(course.id, hash)
    }
  }

  // If generation failed (e.g. quota exhausted), return a placeholder SVG
  if (!image) {
    const description = await findImageDescription(course.id, hash)
    return new Response(placeholderSvg(description || 'Image'), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      },
    })
  }

  return new Response(Buffer.from(image.data), {
    headers: {
      'Content-Type': image.mediaType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})

async function findImageDescription(courseId: string, hash: string): Promise<string | null> {
  try {
    const lessons = await lessonQueries.listByCourse(courseId)
    for (const lesson of lessons) {
      if (!lesson.content) continue
      for (const match of lesson.content.matchAll(IMAGE_REF_REGEX)) {
        if (match[2] === hash) return match[1] || null
      }
    }
  } catch {}
  return null
}

function placeholderSvg(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const truncated = escaped.length > 80 ? escaped.slice(0, 77) + '...' : escaped
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
  <rect width="600" height="300" fill="#1e293b" rx="12"/>
  <text x="300" y="140" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="16">${truncated}</text>
  <text x="300" y="175" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="13">(image generation unavailable)</text>
</svg>`
}

export default app

export const imageGenerateRoute = new Hono<AppEnv>()

imageGenerateRoute.post('/', async (c) => {
  const body = await c.req.json<{ description?: string }>()
  const description = requireNonEmptyString(body.description)
  if (!description) {
    return c.json({ error: 'description string is required' }, 400)
  }

  const result = await imageService.generateVisual(description)
  if (!result) {
    return c.json({ error: 'Image generation failed' }, 502)
  }

  const dataUrl = `data:${result.mediaType};base64,${Buffer.from(result.bytes).toString('base64')}`
  return c.json({ dataUrl, alt: result.alt })
})
