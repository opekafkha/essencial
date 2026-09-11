-- ESENCIAL — esquema inicial para stack self-hosted (Postgres + GoTrue en Railway).
-- Traducido desde supabase/migrations/20260909164923_init_schema.sql: se
-- mantienen tablas, enums, índices y el trigger de alta de usuario
-- (auth.users lo crea GoTrue al arrancar). Se elimina RLS y sus funciones
-- helper (is_admin/current_role/is_member_of_membresia/prevent_role_escalation)
-- porque dependen de auth.uid()/auth.role(), inexistentes fuera de Supabase
-- Cloud — la autorización real ya vive en requireAuth/requireRole (backend/).

create extension if not exists pgcrypto;

-- =========================================================================
-- Enums
-- =========================================================================

create type public.rol as enum ('miembro', 'profesional', 'admin');
create type public.estado_membresia as enum ('activa', 'inactiva');
create type public.tipo_miembro as enum ('titular', 'beneficiario');
create type public.estado_invitacion as enum ('pendiente', 'aceptada', 'expirada', 'cancelada');
create type public.estado_sala as enum ('activa', 'expirada', 'cerrada');
create type public.proveedor_video as enum ('daily');

-- =========================================================================
-- Tablas
-- =========================================================================

-- Extiende auth.users 1:1 (tabla que crea GoTrue). El rol admite exactamente
-- 3 valores (RQ-04) — el rol B2B queda para Fase 2, no agregar aquí.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text,
  role public.rol not null default 'miembro',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliberadamente mínima: sin plan_id ni precio (eso es RQ-09+, fuera de alcance).
create table public.membresias (
  id uuid primary key default gen_random_uuid(),
  titular_user_id uuid not null references public.profiles (id) on delete cascade,
  estado public.estado_membresia not null default 'activa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cada beneficiario tiene su propia cuenta (fila en profiles) — nunca una
-- cuenta compartida. Esta tabla es lo que permite que N cuentas independientes
-- pertenezcan a una misma membresía.
create table public.membresia_miembros (
  id uuid primary key default gen_random_uuid(),
  membresia_id uuid not null references public.membresias (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipo public.tipo_miembro not null,
  created_at timestamptz not null default now(),
  unique (membresia_id, user_id)
);

-- Campos exactamente como los pidió el cliente: membresia_id, email_invitado,
-- token, estado, fecha_expiracion. La vinculación de un beneficiario a una
-- membresía siempre pasa por aquí, nunca por compartir una cuenta.
create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  membresia_id uuid not null references public.membresias (id) on delete cascade,
  email_invitado text not null,
  token text not null unique,
  estado public.estado_invitacion not null default 'pendiente',
  fecha_expiracion timestamptz not null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Spike RQ-44. `slug` es el identificador público y opaco usado en el link
-- compartible — nunca se expone `daily_room_name` tal cual al cliente.
-- `recording_enabled` nunca es una opción real: siempre false (secreto profesional).
create table public.video_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  daily_room_name text not null,
  daily_room_url text not null,
  provider public.proveedor_video not null default 'daily',
  created_by uuid not null references public.profiles (id) on delete cascade,
  status public.estado_sala not null default 'activa',
  recording_enabled boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index membresias_titular_user_id_idx on public.membresias (titular_user_id);
create index membresia_miembros_user_id_idx on public.membresia_miembros (user_id);
create index invitaciones_membresia_id_idx on public.invitaciones (membresia_id);
create index invitaciones_email_invitado_idx on public.invitaciones (email_invitado);
create index video_rooms_created_by_idx on public.video_rooms (created_by);

-- =========================================================================
-- updated_at automático
-- =========================================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at
  before update on public.membresias
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- Alta de usuario: crea profile + membresía propia + membresia_miembros(titular)
-- automáticamente. Así el modelo multi-beneficiario queda listo desde el día 1
-- sin construir el flujo completo de invitación todavía. Rol siempre 'miembro'
-- para el auto-registro público — profesional/admin se asignan aparte (seed).
-- =========================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membresia_id uuid;
begin
  insert into public.profiles (id, email, nombre, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nombre', ''), 'miembro');

  insert into public.membresias (titular_user_id, estado)
  values (new.id, 'activa')
  returning id into v_membresia_id;

  insert into public.membresia_miembros (membresia_id, user_id, tipo)
  values (v_membresia_id, new.id, 'titular');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
