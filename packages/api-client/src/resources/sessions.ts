import type { GraspHttpClient } from '../client.js'
import type { SessionStats, SessionEntry, OkResponse } from '../types.js'

export class SessionsResource {
  constructor(private http: GraspHttpClient) {}

  stats(): Promise<SessionStats> {
    return this.http.get('/api/v1/sessions')
  }

  start(courseSlug?: string): Promise<OkResponse & { session: SessionEntry }> {
    return this.http.post('/api/v1/sessions/start', courseSlug ? { courseSlug } : undefined)
  }

  end(): Promise<OkResponse & { session: SessionEntry }> {
    return this.http.post('/api/v1/sessions/end')
  }
}
