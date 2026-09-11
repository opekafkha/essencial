import { jwtVerify } from 'jose'
import { env } from './env.js'

const secret = new TextEncoder().encode(env.GOTRUE_JWT_SECRET)

export interface GotrueJwtPayload {
  sub: string
  email?: string
}

// Verifica localmente el JWT emitido por GoTrue (HS256, GOTRUE_JWT_SECRET) en
// vez de llamar a auth.getUser(token) por red: GoTrue y este backend son la
// misma autoridad en el stack self-hosted, así que no hace falta el round-trip.
export async function verifyGotrueJwt(token: string): Promise<GotrueJwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as GotrueJwtPayload
}
