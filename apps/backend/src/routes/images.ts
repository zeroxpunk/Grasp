import { Hono } from 'hono'
import type { AppEnv } from '../types.js'
import * as courseService from '../services/course-service.js'
import * as imageService from '../services/image-service.js'
import { requireNonEmptyString } from '../utils/validation.js'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const user = c.get('user')
  const slug = c.req.param('slug')!
  const hash = c.req.param('hash')!.replace(/\.png$/, '')

  const course = await courseService.getCourseBySlug(user.id, slug)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  const image = await imageService.getOrGenerateImage(course.id, hash)
  if (!image) return c.json({ error: 'Image not found' }, 404)

  return new Response(Buffer.from(image.data), {
    headers: {
      'Content-Type': image.mediaType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})

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
