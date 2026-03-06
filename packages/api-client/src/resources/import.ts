import type { GraspHttpClient } from '../client.js'
import type { ImportCourseRequest, ImportCourseResponse, OkResponse } from '../types.js'

export class ImportResource {
  constructor(private http: GraspHttpClient) {}

  course(data: ImportCourseRequest): Promise<ImportCourseResponse> {
    return this.http.post('/api/v1/import/courses', data)
  }

  lessonContent(courseSlug: string, lessonNumber: number, content: string): Promise<OkResponse> {
    return this.http.put(
      `/api/v1/import/courses/${courseSlug}/lessons/${lessonNumber}/content`,
      { content },
    )
  }

  lessonExercises(courseSlug: string, lessonNumber: number, exercises: unknown[]): Promise<OkResponse> {
    return this.http.put(
      `/api/v1/import/courses/${courseSlug}/lessons/${lessonNumber}/exercises`,
      { exercises },
    )
  }
}
