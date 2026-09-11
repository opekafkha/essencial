// Genera un JWT service_role firmado con GOTRUE_JWT_SECRET, para uso local
// del seed únicamente — nunca se despliega ni se usa desde el frontend.
//
// Uso: tsx backend/scripts/mint-service-role-jwt.ts <GOTRUE_JWT_SECRET>
import { SignJWT } from 'jose'

const secretValue = process.argv[2]
if (!secretValue) {
  console.error('Uso: tsx backend/scripts/mint-service-role-jwt.ts <GOTRUE_JWT_SECRET>')
  process.exit(1)
}

const secret = new TextEncoder().encode(secretValue)
const jwt = await new SignJWT({ role: 'service_role' })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('10y')
  .sign(secret)

console.log(jwt)
