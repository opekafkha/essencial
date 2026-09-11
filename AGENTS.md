# ESENCIAL backend — guía del repo

Servidor propio de la plataforma de bienestar/salud mental de FundaColor. Repo separado de
`apps` (que tiene `apps/web` y `apps/desktop`) — se comunican solo por HTTP, nunca comparten
código ni base de datos con otros repos del proyecto.

Self-hosted en Railway, bajo un solo panel: Postgres + GoTrue (Auth) + MinIO (Storage) + este
backend. Ya no depende de Supabase Cloud para nada.

## Stack

Node.js + Express + TS (dev con `tsx`, build con `tsc -b`). Valida localmente (con `jose`, contra
`GOTRUE_JWT_SECRET`) el JWT que emite **GoTrue self-hosted** — no reconstruye login/registro, eso
lo sigue haciendo `@supabase/supabase-js` directo en el frontend (repo `apps`), pero apuntando al
proxy `/auth/v1` que este mismo backend expone hacia GoTrue (GoTrue no sirve rutas bajo `/auth/v1`
por sí solo; ver `src/routes/auth-proxy.routes.ts`). Se conecta a Postgres con Prisma vía
`DATABASE_URL`. Acá vive la lógica de RQ-44 (crear/unirse a sala de Daily.co) y el endpoint
`GET /me` (perfil del usuario autenticado).

`src/roles.ts` y `src/schemas/video-room.schema.ts` son copias locales de lo que antes vivía en
`packages/shared` del monorepo — este repo no depende de ningún paquete compartido con `apps`,
es intencional (ver decisión de separar en 2 repos).

## Autorización: sin RLS, todo en Express (importante, no es un descuido)

No hay Row Level Security en este stack — este backend se conecta a Postgres directo con Prisma y
toda la autorización real vive en `requireAuth`/`requireRole` (`src/middleware/`). Es una decisión
explícita — el usuario pidió un backend propio self-hosted en vez de RLS+Edge Functions de
Supabase Cloud — no un bug de configuración.

## Comandos

- `npm run dev` — levantar el servidor (`http://localhost:3001`).
- `npm run build` / `npm start` — build + arranque de producción (`start` corre
  `prisma migrate deploy` antes de levantar el servidor).
- `npm run prisma:migrate` — flujo local para crear/aplicar migraciones de Prisma contra una
  Postgres local. `prisma/migrations/*.sql` es la fuente de verdad del esquema.
- `npm run typecheck` / `npm run lint` (desde la raíz del monorepo original — acá no hay lint
  propio configurado todavía).
- `npm run seed` — crea usuarios de prueba `profesional`/`admin` (ver README).

## Decisiones que no romper

- El rol admite **exactamente 3 valores**: `miembro`, `profesional`, `admin` (`src/roles.ts`). El
  rol B2B queda para Fase 2 — no agregarlo todavía.
- El registro público (vía el proxy hacia GoTrue) **siempre** crea un usuario en rol `miembro`.
  Los roles `profesional`/`admin` se asignan a mano (`npm run seed` o Prisma Studio) hasta que
  exista el CRUD real de profesionales (RQ-23, futuro).
- Las videollamadas **nunca se graban** — `video_rooms.recording_enabled` siempre `false`, y se
  reafirma a nivel de Daily (`enable_recording` omitido en la sala, `'none'` en el meeting token).
  Es una decisión explícita del cliente (secreto profesional), no un descuido.
- Cada beneficiario de una membresía tiene su **propia cuenta** — nunca una cuenta compartida o
  gestionada por otra persona. La vinculación es siempre vía invitación (tabla `invitaciones`).

## Fuera de alcance en esta tanda (RQ-01/02/03/04/44)

RQ-05 (bloqueo tras 3 intentos, reset de password custom), RQ-06 (auditoría de accesos con
IP/dispositivo), RQ-09/RQ-10 (catálogo de planes, precios, envío real de invitaciones), RQ-16+
(agenda completa). No construir nada de esto todavía — son requerimientos separados y facturados
aparte según el plan del cliente.

## Pendiente manual (no lo ejecuta el agente)

- Desplegar Postgres + GoTrue + MinIO + este backend en Railway siguiendo `infra/RUNBOOK.md`
  (crear servicios, pegar env vars, conectar este repo por GitHub).
- Migración de datos reales (usuarios, perfiles, membresías) desde la Postgres vieja de Supabase
  Cloud hacia la nueva Postgres de Railway — se hace aparte, con más cuidado (dump/restore), no
  como parte de este cambio de código.
