# Runbook: desplegar ESENCIAL self-hosted en Railway

Pasos manuales para dejar el stack corriendo. El código ya está preparado —
esto es solo crear servicios en Railway y pegar variables de entorno.
Migración de datos reales de producción: fuera de este runbook, se hace
aparte cuando decidas.

## 1. Postgres

Railway → **+ New → Database → PostgreSQL** (plugin gestionado, no imagen
Docker cruda — genera `DATABASE_URL` referenciable por los demás servicios
sin copiar/pegar).

## 2. GoTrue (Auth)

Railway → **+ New → Docker Image** → `ghcr.io/supabase/gotrue:<tag>` (revisar
el tag más reciente en https://github.com/supabase/auth/pkgs/container/gotrue).

Pegar las variables de `infra/gotrue/gotrue.env.example`, completando:
- `GOTRUE_DB_DATABASE_URL` → referencia `${{Postgres.DATABASE_URL}}`
- `GOTRUE_JWT_SECRET` → generar uno (`openssl rand -base64 48`), guardarlo
  también para el paso 4
- `API_EXTERNAL_URL` / `GOTRUE_SITE_URL` / `GOTRUE_URI_ALLOW_LIST` → dominios
  reales una vez existan (backend y web)

**No generar dominio público** — solo se consume por red privada de Railway.

## 3. MinIO (Storage)

Railway → **+ New → Docker Image** → `minio/minio`.

- Start command: `minio server /data --address ":9000" --console-address ":9001"`
- Adjuntar volumen en `/data`
- Pegar variables de `infra/minio/minio.env.example`
- Generar dominio público en el puerto 9000

No hay nada que migrar todavía (ningún código usa Storage hoy) — este
servicio queda listo para cuando se necesite.

## 4. Backend

Railway → **+ New → GitHub Repo** → seleccionar este repo.

- **Root Directory**: la raíz del repo (no `backend/`) — es un monorepo npm
  workspaces, `npm ci` necesita ver el `package.json` raíz para resolver el
  link a `@esencial/shared`.
- **Build Command**: `npm run build -w packages/shared && npm run build -w backend`
- **Start Command**: `npm run start -w backend`
- Variables (ver `backend/.env.example`):
  - `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
  - `GOTRUE_URL` → URL interna de Railway del servicio GoTrue del paso 2
    (ej. `http://<nombre-servicio-gotrue>.railway.internal:9999`)
  - `GOTRUE_JWT_SECRET` → el mismo valor generado en el paso 2
  - `DAILY_API_KEY`, `WEB_APP_URL`, `ALLOWED_ORIGINS`, `PORT` → como ya se
    usaban
- Generar dominio público para este servicio.

Una vez tenga dominio, volver al paso 2 y actualizar `API_EXTERNAL_URL` /
`GOTRUE_SITE_URL` con las URLs reales de backend y web.

## 5. Frontend (local)

Actualizar `apps/web/.env` y `apps/desktop/.env` (copiar de sus
`.env.example`):
- `VITE_SUPABASE_URL` y `VITE_BACKEND_URL` → dominio público del backend
  (paso 4)
- `VITE_SUPABASE_ANON_KEY` → dejar el placeholder, no tiene función de
  seguridad en este stack

## 6. (Opcional) Seed de usuarios de prueba

```
tsx backend/scripts/mint-service-role-jwt.ts <GOTRUE_JWT_SECRET>
```

Copiar el JWT resultante a `backend/scripts/.env` (`SERVICE_ROLE_JWT`, ver
`.env.example`), junto con `BACKEND_URL`, y correr:

```
npm run seed
```

Crea `profesional.test@esencial.local` y `admin.test@esencial.local`
(contraseña `Esencial123!`).
