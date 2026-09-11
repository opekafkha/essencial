import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  GOTRUE_URL: z.string().url(),
  GOTRUE_JWT_SECRET: z.string().min(32),
  DAILY_API_KEY: z.string().min(1),
  WEB_APP_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().min(1),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Variables de entorno inválidas o faltantes:\n${parsed.error.message}`)
}

export const env = {
  ...parsed.data,
  ALLOWED_ORIGINS: parsed.data.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
}
