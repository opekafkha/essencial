-- GoTrue no crea el schema "auth" por sí solo — solo las tablas dentro de él,
-- asumiendo que ya existe. Este script corre automáticamente la primera vez
-- que arranca el contenedor de Postgres (docker-entrypoint-initdb.d), antes
-- de que GoTrue intente migrar.
CREATE SCHEMA IF NOT EXISTS auth;
