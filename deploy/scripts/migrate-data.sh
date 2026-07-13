#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Carga los datos reales (extraídos del contenedor local domio-postgres) en la
# base de datos de un entorno, sobre un esquema construido por las migraciones.
#
# Estrategia (segura pese al drift 4→8 del origen):
#   1. Migraciones (las 8) crean el esquema final en el destino.
#   2. Se cargan SOLO los datos de aplicación (dump --data-only, sin tablas de
#      sistema PostGIS ni journal de drizzle). Las columnas nuevas de 0004-0007
#      son nullable → los datos antiguos entran sin conflicto.
#
# Uso:
#   deploy/scripts/migrate-data.sh <project> <appdata_dump>
#   deploy/scripts/migrate-data.sh domio-prod backups/domio_appdata_20260713.dump
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT="${1:?Falta <project> (p.ej. domio-prod o domio-dev)}"
DUMP="${2:?Falta la ruta al dump --data-only}"
# domio-prod → deploy/env.prod · domio-dev → deploy/env.dev
ENVFILE="deploy/env.${PROJECT#domio-}"
COMPOSE="docker compose -p ${PROJECT} --env-file ${ENVFILE} -f deploy/docker-compose.app.yml"

[ -f "$DUMP" ]    || { echo "No existe el dump: $DUMP" >&2; exit 1; }
[ -f "$ENVFILE" ] || { echo "No existe el env de deploy: $ENVFILE" >&2; exit 1; }

echo "▶ [$PROJECT] Esperando a que Postgres esté sano…"
until $COMPOSE ps postgres | grep -q healthy; do sleep 2; done

echo "▶ [$PROJECT] Aplicando migraciones (esquema limpio, las 8)…"
$COMPOSE run --rm tools pnpm db:migrate

echo "▶ [$PROJECT] Cargando datos de aplicación…"
$COMPOSE exec -T postgres pg_restore \
  --data-only --disable-triggers --no-owner \
  -U domio -d domio < "$DUMP"

echo "▶ [$PROJECT] Verificación:"
$COMPOSE exec -T postgres psql -U domio -d domio -c \
  "select 'promociones' t, count(*) from promociones
   union all select 'unidades', count(*) from unidades
   union all select 'users', count(*) from users
   union all select 'leads', count(*) from leads;"

echo "✅ [$PROJECT] Datos cargados."
