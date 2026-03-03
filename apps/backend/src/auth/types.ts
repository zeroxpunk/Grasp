export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}

export interface AuthProvider {
  name: string
  verify(token: string): Promise<AuthUser | null>
}
