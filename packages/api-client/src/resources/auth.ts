import type { GraspHttpClient } from '../client'
import type { AuthSessionResponse, OkResponse } from '../types'

export class AuthResource {
  constructor(private http: GraspHttpClient) {}

  verifyGoogle(idToken: string, deviceInfo?: string): Promise<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>('/api/auth/google/verify', { idToken, deviceInfo })
  }

  exchangeGoogleCode(code: string, redirectUri?: string, deviceInfo?: string): Promise<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>('/api/auth/google/exchange', { code, redirectUri, deviceInfo })
  }

  exchangeDevCode(code: string, deviceInfo?: string): Promise<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>('/api/auth/desktop/session/exchange', { code, deviceInfo })
  }

  refresh(refreshToken: string, deviceInfo?: string): Promise<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>('/api/auth/desktop/session/refresh', { refreshToken, deviceInfo })
  }

  logout(refreshToken?: string): Promise<OkResponse> {
    return this.http.post<OkResponse>('/api/auth/desktop/session/logout', { refreshToken })
  }
}
