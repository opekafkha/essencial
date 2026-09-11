# ESENCIAL — backend

Servidor propio (Node.js + Express + TS + Prisma) de la plataforma de bienestar/salud mental de
FundaColor. Self-hosted en Railway junto a Postgres + GoTrue (Auth) + MinIO (Storage) — no depende
de Supabase Cloud para nada. Ver [AGENTS.md](./AGENTS.md) para stack y decisiones de diseño.

Lo consumen `apps/web` y `apps/desktop` (repo aparte) vía HTTP.

## Arranque rápido

```bash
nvm use
npm install
cp .env.example .env

docker compose -f infra/docker-compose.local.yml up -d
# completar .env con los valores que indica ese archivo
# (DATABASE_URL / GOTRUE_URL / GOTRUE_JWT_SECRET apuntando a localhost)

npm run prisma:migrate   # aplica prisma/migrations/*.sql

npm run dev   # http://localhost:3001 — sirve /auth/v1/* como proxy hacia GoTrue
```

Para desplegar en Railway (Postgres + GoTrue + MinIO + este backend), ver
[infra/RUNBOOK.md](./infra/RUNBOOK.md).

## Usuarios de prueba

```bash
tsx scripts/mint-service-role-jwt.ts <GOTRUE_JWT_SECRET>
# copiar el JWT resultante a scripts/.env (ver scripts/.env.example)
npm run seed
```
