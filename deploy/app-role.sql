-- Rol de conexión de la aplicación web.
--
-- Por qué existe: hasta ahora la app conectaba con el superusuario que crea la
-- imagen de Postgres (POSTGRES_USER). Los superusuarios saltan el RLS SIEMPRE,
-- incluso con FORCE ROW LEVEL SECURITY, así que las políticas de aislamiento
-- por tenant estaban activas en los tests pero no en producción.
--
-- Este rol es NOSUPERUSER + NOBYPASSRLS: las políticas se le aplican de verdad.
-- No es dueño de ninguna tabla (no puede hacer DDL): las migraciones las sigue
-- ejecutando el owner desde el contenedor `worker`.
--
-- Se ejecuta como el owner, y es idempotente: reejecutar tras una migración que
-- añada tablas es la forma de darle permisos sobre ellas (aunque ALTER DEFAULT
-- PRIVILEGES ya cubre las que cree el owner a partir de ahora).
--
--   make -f deploy/Makefile app-role-dev    (o app-role-prod)

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'domio_app') THEN
    CREATE ROLE domio_app LOGIN;
  END IF;
END
$$;

ALTER ROLE domio_app
  WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
  PASSWORD :'app_password';

GRANT USAGE ON SCHEMA public TO domio_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO domio_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO domio_app;

-- Tablas y secuencias que el owner cree en migraciones futuras.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO domio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO domio_app;

SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles
WHERE rolname = 'domio_app';
