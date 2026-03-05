import type { GraspHttpClient } from '../client.js'
import type {
  CourseSummary,
  CourseManifest,
  CreateCourseRequest,
  JobCreatedResponse,
  OkResponse,
} from '../types.js'

export class CoursesResource {
  constructor(private http: GraspHttpClient) {}

  list(): Promise<CourseSummary[]> {
    return this.http.get('/api/v1/courses')
  }

  get(slug: string): Promise<CourseManifest> {
    return this.http.get(`/api/v1/courses/${encodeURIComponent(slug)}`)
  }

  create(data: CreateCourseRequest): Promise<JobCreatedResponse> {
    return this.http.post('/api/v1/courses', data)
  }

  delete(slug: string): Promise<OkResponse> {
    return this.http.delete(`/api/v1/courses/${encodeURIComponent(slug)}`)
  }
}
