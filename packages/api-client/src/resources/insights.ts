import type { GraspHttpClient } from '../client.js'
import type { InsightEntry } from '../types.js'

export class InsightsResource {
  constructor(private http: GraspHttpClient) {}

  list(courseSlug: string): Promise<InsightEntry[]> {
    return this.http.get(`/api/v1/courses/${encodeURIComponent(courseSlug)}/insights`)
  }
}
