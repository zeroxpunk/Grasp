import { GraspHttpClient } from './client'
import { CoursesResource } from './resources/courses'
import { LessonsResource } from './resources/lessons'
import { ExercisesResource } from './resources/exercises'
import { ChatResource } from './resources/chat'
import { EvaluateResource } from './resources/evaluate'
import { SessionsResource } from './resources/sessions'
import { ImagesResource } from './resources/images'
import { InsightsResource } from './resources/insights'
import { JobsResource } from './resources/jobs'
import { UserResource } from './resources/user'
import { ImportResource } from './resources/import'
import type { ClientConfig } from './types'

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
  readonly import: ImportResource

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
    this.import = new ImportResource(this.http)
  }
}

export { ApiError } from './client'
export type * from './types'
