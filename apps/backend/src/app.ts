import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './types.js'
import { createAuthProvider } from './auth/index.js'
import { authMiddleware } from './middleware/auth.js'
import { errorHandler } from './middleware/error.js'
import coursesRoute from './routes/courses.js'
import lessonsRoute from './routes/lessons.js'
import exercisesRoute from './routes/exercises.js'
import chatRoute from './routes/chat.js'
import evaluateRoute from './routes/evaluate.js'
import sessionsRoute from './routes/sessions.js'
import imagesRoute, { imageGenerateRoute } from './routes/images.js'
import insightsRoute from './routes/insights.js'
import jobsRoute from './routes/jobs.js'
import userRoute from './routes/user.js'

const app = new Hono<AppEnv>()

app.use('*', cors())
app.onError(errorHandler)

const authProvider = createAuthProvider()
app.use('/api/*', authMiddleware(authProvider))

app.get('/', (c) => c.json({ name: 'Grasp API', version: '0.1.0' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

const v1 = new Hono<AppEnv>()
v1.route('/courses', coursesRoute)
v1.route('/courses/:slug/lessons/:number', lessonsRoute)
v1.route('/courses/:slug/lessons/:number/exercises', exercisesRoute)
v1.route('/courses/:slug/lessons/:number/chat', chatRoute)
v1.route('/courses/:slug/insights', insightsRoute)
v1.route('/courses/:slug/images/:hash', imagesRoute)
v1.route('/evaluate', evaluateRoute)
v1.route('/sessions', sessionsRoute)
v1.route('/images/generate', imageGenerateRoute)
v1.route('/jobs', jobsRoute)
v1.route('/me', userRoute)

app.route('/api/v1', v1)

export default app
