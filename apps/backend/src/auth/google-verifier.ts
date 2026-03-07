import { OAuth2Client } from 'google-auth-library'
import type { AuthIdentity } from './types'

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<AuthIdentity | null> {
  const client = new OAuth2Client(clientId)
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId })
    const payload = ticket.getPayload()
    if (!payload?.email) return null

    return {
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      displayName: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    }
  } catch {
    return null
  }
}

export async function exchangeGoogleAuthCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<AuthIdentity | null> {
  const client = new OAuth2Client(clientId, clientSecret, redirectUri)
  try {
    const { tokens } = await client.getToken(code)
    if (!tokens.id_token) return null
    return verifyGoogleIdToken(tokens.id_token, clientId)
  } catch {
    return null
  }
}
