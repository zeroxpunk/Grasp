import { serve } from '@hono/node-server'
import app from './app'
import { startJobWorker } from './services/job-runner'

const port = Number(process.env.PORT) || 4000

startJobWorker()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Grasp API server running on http://localhost:${info.port}`)
})
