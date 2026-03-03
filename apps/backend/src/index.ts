import { serve } from '@hono/node-server'
import app from './app.js'

const port = Number(process.env.PORT) || 4000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Grasp API server running on http://localhost:${info.port}`)
})
