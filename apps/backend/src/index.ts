import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.json({ name: 'Grasp API', version: '0.1.0' })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

const port = Number(process.env.PORT) || 4000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Grasp API server running on http://localhost:${info.port}`)
})
