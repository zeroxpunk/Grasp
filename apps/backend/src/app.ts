import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './types'
import { createAuthProvider } from './auth/index'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error'
import authRoute from './routes/auth'
import coursesRoute from './routes/courses'
import lessonsRoute from './routes/lessons'
import exercisesRoute from './routes/exercises'
import chatRoute from './routes/chat'
import evaluateRoute from './routes/evaluate'
import sessionsRoute from './routes/sessions'
import imagesRoute, { imageGenerateRoute } from './routes/images'
import insightsRoute from './routes/insights'
import jobsRoute from './routes/jobs'
import userRoute from './routes/user'
import dataImportRoute from './routes/data-import'

const app = new Hono<AppEnv>()

app.use('*', cors())
app.onError(errorHandler)
app.route('/api/auth', authRoute)

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
v1.route('/import', dataImportRoute)

app.route('/api/v1', v1)

export default app
