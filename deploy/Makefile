# Operación del VPS. Ejecutar desde la raíz del repo:  make -f deploy/Makefile <target>
APP  := -f deploy/docker-compose.app.yml
PROXY:= -f deploy/docker-compose.proxy.yml

.PHONY: net proxy-up dev-up prod-up dev-migrate prod-migrate logs-% backup down-% build-% deploy-%

# Variables que Next necesita en BUILD (se hornean en la imagen), no en runtime.
# Todas son públicas: viajan en el bundle que descarga cualquier visitante.
# Ninguna es un secreto — los secretos jamás se hornean en la imagen.
BUILD_VARS := NEXT_PUBLIC_APP_ENV NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_TURNSTILE_SITE_KEY \
              PUBLIC_TENANT_ID R2_PUBLIC_URL

net:                     ## Crear la red compartida (una sola vez)
	docker network inspect domio-web >/dev/null 2>&1 || docker network create domio-web

proxy-up: net           ## Levantar Caddy
	docker compose -p domio-proxy --env-file deploy/env.proxy $(PROXY) up -d

dev-up: net             ## Levantar/actualizar stack development
	docker compose -p domio-dev --env-file deploy/env.dev $(APP) pull
	docker compose -p domio-dev --env-file deploy/env.dev $(APP) up -d

prod-up: net            ## Levantar/actualizar stack producción
	docker compose -p domio-prod --env-file deploy/env.prod $(APP) pull
	docker compose -p domio-prod --env-file deploy/env.prod $(APP) up -d

dev-migrate:            ## Migraciones en development
	docker compose -p domio-dev --env-file deploy/env.dev $(APP) run --rm worker pnpm db:migrate

prod-migrate:          ## Migraciones en producción
	docker compose -p domio-prod --env-file deploy/env.prod $(APP) run --rm worker pnpm db:migrate

logs-%:                ## make -f deploy/Makefile logs-prod  (o logs-dev)
	docker compose -p domio-$* --env-file deploy/env.$* $(APP) logs -f --tail=100

down-%:                ## Parar un stack: down-dev / down-prod
	docker compose -p domio-$* --env-file deploy/env.$* $(APP) down

build-%:               ## Construir imágenes web + tools: build-dev / build-prod
	@set -a; . ./deploy/env.$*; \
	envf="$$APP_ENV_FILE"; \
	case "$$envf" in /*) ;; *) envf="deploy/$$envf" ;; esac; \
	[ -f "$$envf" ] || { echo "✗ No existe $$envf (APP_ENV_FILE=$$APP_ENV_FILE)"; exit 1; }; \
	. "$$envf"; set +a; \
	for v in $(BUILD_VARS); do \
	  eval "val=\$$$$v"; \
	  [ -n "$$val" ] || { echo "✗ Falta $$v en $$envf (se necesita en BUILD)"; exit 1; }; \
	  args="$$args --build-arg $$v=$$val"; \
	done; \
	echo "▶ build $$IMAGE_WEB:$$IMAGE_TAG"; \
	docker build --target runner $$args -t "$$IMAGE_WEB:$$IMAGE_TAG" .; \
	echo "▶ build $$IMAGE_TOOLS:$$IMAGE_TAG"; \
	docker build --target tools $$args -t "$$IMAGE_TOOLS:$$IMAGE_TAG" .

# El worker corre la imagen tools, no la web: si solo se recrea 'web', el worker
# se queda con el código viejo. Se levantan los dos.
deploy-%: build-%      ## Build + levantar web y worker sin pull: deploy-dev / deploy-prod
	docker compose -p domio-$* --env-file deploy/env.$* $(APP) up -d web worker

backup:                ## pg_dump de producción → backups/
	@mkdir -p backups
	docker compose -p domio-prod --env-file deploy/env.prod $(APP) exec -T postgres \
	  pg_dump -U domio -d domio -Fc > backups/prod_$$(date +%Y%m%d_%H%M).dump
	@echo "OK → backups/"
