import type { GraspHttpClient } from '../client'
import type { UserProfile, UpdateUserRequest, OkResponse } from '../types'

export class UserResource {
  constructor(private http: GraspHttpClient) {}

  me(): Promise<UserProfile> {
    return this.http.get('/api/v1/me')
  }

  update(data: UpdateUserRequest): Promise<OkResponse> {
    return this.http.patch('/api/v1/me', data)
  }
}
