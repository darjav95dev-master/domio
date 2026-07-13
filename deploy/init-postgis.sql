-- Se ejecuta una sola vez al inicializar el volumen de Postgres.
-- Las migraciones de la app NO crean la extensión, y el tipo geometry(Point,4326)
-- de promociones.location la necesita. La imagen postgis ya la suele crear en la
-- POSTGRES_DB por defecto; esto lo hace explícito y reproducible.
CREATE EXTENSION IF NOT EXISTS postgis;
