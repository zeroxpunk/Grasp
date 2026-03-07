import type { GraspHttpClient } from '../client'
import type { LessonDetail, JobCreatedResponse } from '../types'

export class LessonsResource {
  constructor(private http: GraspHttpClient) {}

  get(courseSlug: string, lessonNumber: number): Promise<LessonDetail> {
    return this.http.get(`/api/v1/courses/${encodeURIComponent(courseSlug)}/lessons/${lessonNumber}`)
  }

  generate(courseSlug: string, lessonNumber: number): Promise<JobCreatedResponse> {
    return this.http.post(`/api/v1/courses/${encodeURIComponent(courseSlug)}/lessons/${lessonNumber}/generate`)
  }
}
