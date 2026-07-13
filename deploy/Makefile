# Operación del VPS. Ejecutar desde la raíz del repo:  make -f deploy/Makefile <target>
APP  := -f deploy/docker-compose.app.yml
PROXY:= -f deploy/docker-compose.proxy.yml

.PHONY: net proxy-up dev-up prod-up dev-migrate prod-migrate logs-% backup down-%

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
	docker compose -p domio-dev --env-file deploy/env.dev $(APP) run --rm tools pnpm db:migrate

prod-migrate:          ## Migraciones en producción
	docker compose -p domio-prod --env-file deploy/env.prod $(APP) run --rm tools pnpm db:migrate

logs-%:                ## make -f deploy/Makefile logs-prod  (o logs-dev)
	docker compose -p domio-$* $(APP) logs -f --tail=100

down-%:                ## Parar un stack: down-dev / down-prod
	docker compose -p domio-$* $(APP) down

backup:                ## pg_dump de producción → backups/
	@mkdir -p backups
	docker compose -p domio-prod $(APP) exec -T postgres \
	  pg_dump -U domio -d domio -Fc > backups/prod_$$(date +%Y%m%d_%H%M).dump
	@echo "OK → backups/"
