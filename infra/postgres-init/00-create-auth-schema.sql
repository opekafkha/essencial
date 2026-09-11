-- GoTrue no crea el schema "auth" por sí solo — solo las tablas dentro de él,
-- asumiendo que ya existe. Este script corre automáticamente la primera vez
-- que arranca el contenedor de Postgres (docker-entrypoint-initdb.d), antes
-- de que GoTrue intente migrar.
CREATE SCHEMA IF NOT EXISTS auth;

-- Bug documentado de GoTrue: la migración add_mfa_phone_config hace
-- ALTER TYPE auth.factor_type ADD VALUE 'phone' asumiendo que el enum ya
-- existe, pero en una base nueva nunca se crea solo.
-- Ver github.com/AppFlowy-IO/AppFlowy-Cloud#909.
DO $$ BEGIN
  CREATE TYPE auth.factor_type AS ENUM ();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
