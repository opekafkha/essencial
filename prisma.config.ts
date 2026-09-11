import { defineConfig } from 'prisma/config'

// Solo para los comandos del CLI (prisma db pull, prisma studio, etc.).
// El cliente en tiempo de ejecución arma su propio adapter en src/lib/prisma.ts.
// Fallback en vez de env('DATABASE_URL'): ese helper lanza si la variable no
// existe, y `prisma generate` (postinstall, CI, clone en frío) debe funcionar
// solo con el schema commiteado, sin DATABASE_URL real todavía.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
})
