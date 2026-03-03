import { GraspHttpClient } from './client.js'
import { CoursesResource } from './resources/courses.js'
import { LessonsResource } from './resources/lessons.js'
import { ExercisesResource } from './resources/exercises.js'
import { ChatResource } from './resources/chat.js'
import { EvaluateResource } from './resources/evaluate.js'
import { SessionsResource } from './resources/sessions.js'
import { ImagesResource } from './resources/images.js'
import { InsightsResource } from './resources/insights.js'
import { JobsResource } from './resources/jobs.js'
import { UserResource } from './resources/user.js'
import type { ClientConfig } from './types.js'

export class GraspClient {
  private http: GraspHttpClient

  readonly courses: CoursesResource
  readonly lessons: LessonsResource
  readonly exercises: ExercisesResource
  readonly chat: ChatResource
  readonly evaluate: EvaluateResource
  readonly sessions: SessionsResource
  readonly images: ImagesResource
  readonly insights: InsightsResource
  readonly jobs: JobsResource
  readonly user: UserResource

  constructor(config: ClientConfig) {
    this.http = new GraspHttpClient(config)
    this.courses = new CoursesResource(this.http)
    this.lessons = new LessonsResource(this.http)
    this.exercises = new ExercisesResource(this.http)
    this.chat = new ChatResource(this.http)
    this.evaluate = new EvaluateResource(this.http)
    this.sessions = new SessionsResource(this.http)
    this.images = new ImagesResource(this.http)
    this.insights = new InsightsResource(this.http)
    this.jobs = new JobsResource(this.http)
    this.user = new UserResource(this.http)
  }
}

export { ApiError } from './client.js'
export type * from './types.js'
