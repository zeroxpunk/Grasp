import type { GraspHttpClient } from '../client.js'
import type { JobCreatedResponse, UpdateExerciseProgressRequest, OkResponse } from '../types.js'

export class ExercisesResource {
  constructor(private http: GraspHttpClient) {}

  regenerate(courseSlug: string, lessonNumber: number): Promise<JobCreatedResponse> {
    return this.http.post(
      `/api/v1/courses/${encodeURIComponent(courseSlug)}/lessons/${lessonNumber}/exercises/regenerate`,
    )
  }

  updateProgress(
    courseSlug: string,
    lessonNumber: number,
    exerciseNumber: number,
    data: UpdateExerciseProgressRequest,
  ): Promise<OkResponse> {
    return this.http.post(
      `/api/v1/courses/${encodeURIComponent(courseSlug)}/lessons/${lessonNumber}/exercises/${exerciseNumber}/progress`,
      data,
    )
  }
}
