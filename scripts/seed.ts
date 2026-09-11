// Crea los usuarios de prueba PROFESIONAL y ADMIN vía el Admin API de GoTrue
// (bypass del auto-registro público, que siempre crea MIEMBRO). Consistente
// con "sin auto-registro de profesional/admin" — RQ-23 construirá el CRUD
// real de profesionales más adelante.
//
// Uso: completar backend/scripts/.env (copiar de .env.example, con un
// SERVICE_ROLE_JWT generado por mint-service-role-jwt.ts) y correr
//   npm run seed
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma.js'

config({ path: resolve(import.meta.dirname, '.env') })

const backendUrl = process.env.BACKEND_URL
const serviceRoleJwt = process.env.SERVICE_ROLE_JWT

if (!backendUrl || !serviceRoleJwt) {
  console.error('Faltan BACKEND_URL / SERVICE_ROLE_JWT en backend/scripts/.env')
  process.exit(1)
}

// El admin API de GoTrue vive en <backendUrl>/auth/v1 (proxeado por
// backend/src/routes/auth-proxy.routes.ts) — protocolo-compatible con
// @supabase/supabase-js, solo cambia dónde vive el servidor.
const admin = createClient(backendUrl, serviceRoleJwt, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_USERS = [
  {
    email: 'profesional.test@esencial.local',
    password: 'Esencial123!',
    nombre: 'Profesional de prueba',
    role: 'profesional' as const,
  },
  {
    email: 'admin.test@esencial.local',
    password: 'Esencial123!',
    nombre: 'Admin de prueba',
    role: 'admin' as const,
  },
]

async function main() {
  for (const user of TEST_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { nombre: user.nombre },
    })

    let userId = data?.user?.id

    if (error) {
      // Re-ejecutable: si el usuario ya existe, solo aseguramos el rol.
      const existing = await prisma.profile.findUnique({
        where: { email: user.email },
        select: { id: true },
      })

      if (!existing) {
        console.error(`No se pudo crear ${user.email}: ${error.message}`)
        continue
      }
      userId = existing.id
    }

    // El trigger handle_new_user() ya creó el profile en rol 'miembro'.
    // Acá lo subimos directo con Prisma (bypass de autorización, script local).
    await prisma.profile.update({ where: { id: userId }, data: { role: user.role } })

    console.log(`Listo: ${user.email} / ${user.password} (${user.role})`)
  }
}

main().finally(() => prisma.$disconnect())
