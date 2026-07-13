# Guía oficial de despliegue — Domio (TFM)

> Documento técnico de referencia para llevar Domio desde el entorno local hasta
> producción de forma profesional, reproducible, segura y mantenible.
> **Todo lo que sigue está basado en el código real auditado**, no en supuestos.
> Contexto: Trabajo Fin de Máster. Prioridad = calidad técnica defendible con la
> **mínima complejidad** que no comprometa seguridad ni arquitectura.

---

## FASE 1 — Auditoría del proyecto (estado real)

### Stack detectado (evidencia en código)

| Área | Tecnología | Evidencia |
|------|-----------|-----------|
| Framework | Next.js **15.5.20**, App Router, React 19 | `package.json`, `app/` |
| Build | `output: "standalone"` | `next.config.ts:13` |
| Lenguaje | TypeScript 5, `tsc --noEmit` estricto | `tsconfig.json`, script `typecheck` |
| Gestor | pnpm **9.15.9** (corepack), Node ≥ 20 | `package.json` `engines`/`packageManager` |
| DB | PostgreSQL vía **`pg` (Pool TCP)** + Drizzle ORM (`node-postgres`) | `src/infrastructure/db/client.ts` |
| Migraciones | drizzle-kit, **8 migraciones SQL** (`0000`→`0007`) | `src/infrastructure/db/migrations/` |
| Multi-tenant | Aislamiento por `SET LOCAL` (RLS) + guardas CI | `middleware`, `ci.yml` grep checks |
| Auth | next-auth **v4** (JWT, verificación en Edge middleware) | `middleware.ts`, `app/api/auth/[...nextauth]` |
| Almacenamiento | Cloudflare **R2** vía `@aws-sdk/client-s3` + presigned URLs | `src/infrastructure/media/`, deps AWS SDK |
| Email | **Resend** + **cola en DB** (`email_queue`) + worker standalone | `scripts/worker-emails.ts`, `src/infrastructure/email/` |
| Rate limiting | **Upstash Redis** (cliente HTTP) con fallback no-op | `src/infrastructure/rate-limiting/` |
| Observabilidad | **Sentry** (`@sentry/nextjs`) + `instrumentation.ts` | `sentry.*.config.ts` |
| Anti-bot | Cloudflare **Turnstile** (captcha en formularios) | `.env.example` `TURNSTILE_*` |
| API pública | v1 versionada + OpenAPI (`zod-to-openapi`) + API keys | `app/api/v1/`, `app/api/internal/docs` |
| Tests | Vitest (unit), Playwright (e2e), tests de contrato | `vitest.config.ts`, `playwright.config.ts`, `tests/` |
| Hooks | Husky: pre-commit (lint+typecheck), pre-push (test+build) | `.husky/` |
| CI | GitHub Actions, **un job de calidad** | `.github/workflows/ci.yml` |
| Entornos | `APP_ENV` semántico: `local`/`development`/`production` | `ENVIRONMENTS.md`, scripts `*:development`/`*:production` |

### Estructura

```
app/                      # App Router: páginas públicas, /panel (backoffice), /api
src/
  features/               # lógica por feature (catalog, contact, engagement, api-public…)
  infrastructure/         # db, auth, email, media, observability, rate-limiting, tenant, slug
  shared/                 # reutilizable
tests/                    # unit, isolation, contract, e2e
scripts/                  # seed.ts, worker-emails.ts
```

### Configuración presente vs ausente

**Presente y correcto:**
- `output: standalone` → el proyecto **ya está preparado para contenerizar** (Next genera un server autónomo con dependencias mínimas). Es la pista más importante: se diseñó para deploy tipo contenedor, no para Vercel puro.
- Cabeceras de seguridad globales (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) en `next.config.ts`.
- Plantilla de entorno `.env.example` (sin secretos, commiteada, validada por un test). Los reales (`.env.local`, `.env.development`, `.env.production`) están gitignored.
- Migraciones versionadas + comandos `db:migrate`/`db:generate`.
- Guardas de arquitectura en CI (no `SET` sin `LOCAL`, no queries crudas fuera de repositorios) → protege el aislamiento multi-tenant.
- Rate limiting de login en el middleware Edge.

**Ausente (los huecos reales):**
- ❌ **No hay `Dockerfile` ni `docker-compose.yml`** en ningún sitio del repo. `output: standalone` está puesto pero **nada lo consume**.
- ❌ **No hay CD**: el CI solo hace calidad. No construye imagen, no despliega, no ejecuta migraciones.
- ❌ El CI **no ejecuta e2e ni contract tests** (existen los scripts, pero no están en el pipeline).
- ❌ No hay automatización de **backups** ni de **restauración**.
- ❌ No hay gestión formal de **secretos** de producción (solo ficheros `.env.*` locales).
- ❌ No hay `healthcheck` real: `/api/health` devuelve `{status:"ok"}` fijo.

### Configuraciones incompletas / obsoletas / drift detectado

1. **Drift `ENVIRONMENTS.md` ↔ código:** el doc afirma que `GET /api/health` devuelve `{status,env}`; el código (`app/api/health/route.ts`) devuelve solo `{status:"ok"}`. → No sirve para verificar qué entorno arrancó.
2. **Riesgo silencioso de rate limiting:** si `RATE_LIMIT_STORE_URL` **no** está definida, `createRateLimiter()` devuelve un `NoopRateLimiter` que **permite todas las peticiones**. En producción, olvidar esa variable **desactiva sin avisar** la protección de fuerza bruta y los límites de la API pública.
3. **Cliente Redis = HTTP de Upstash**, no TCP. No se puede apuntar a un Redis autohospedado estándar sin un proxy HTTP (SRH) o cambiar el cliente. Relevante para decidir si Upstash es sustituible (ver Fase de servicios).
4. **`DATABASE_URL` comentada como "Neon"** pero el cliente es `pg` (Pool TCP genérico) → funciona con **cualquier** Postgres, no atado a Neon. Buena noticia: portabilidad total.
5. **Worker de email desacoplado:** es un proceso propio (`pnpm worker:emails`, poll cada 30s). Cualquier plataforma de deploy debe contemplar **dos procesos** (web + worker), no uno.

---

## FASE 2 — Diagnóstico

### Qué está preparado
Aplicación contenerizable (`standalone`), migraciones versionadas, seguridad de cabeceras, aislamiento multi-tenant con guardas automáticas, separación limpia de infraestructura, CI de calidad funcionando, entornos semánticos bien pensados.

### Qué falta
Artefactos de despliegue (Dockerfile + compose), pipeline de CD, ejecución de migraciones en deploy, backups automatizados, gestión de secretos de producción, healthcheck útil, e2e/contract en CI.

### Qué habría que modificar (solo lo necesario)
- `app/api/health/route.ts`: incluir `env: process.env.APP_ENV` (alinear con `ENVIRONMENTS.md` y permitir verificación de deploy). **1 línea.**
- Arranque de producción: **fallar el boot si `RATE_LIMIT_STORE_URL` falta** en `APP_ENV=production` (convertir el fallo silencioso en fallo ruidoso). Pequeña guarda en instrumentation/arranque.

### Riesgos
| Riesgo | Severidad | Mitigación |
|--------|-----------|-----------|
| Rate limiting desactivado en silencio | **Alta** | Guarda de arranque + variable presente en secretos |
| Migración destructiva sin backup previo | **Alta** | `pg_dump` obligatorio antes de `db:migrate` en el pipeline |
| Drizzle no genera migraciones *down* → rollback de esquema difícil | Media | Política **expand/contract** (forward-only) + restaurar dump |
| Secretos en ficheros `.env.*` | Media | Secrets de la plataforma / GitHub Environments, nunca en repo |
| Pérdida de imágenes al recrear contenedor | Media | Media en R2 (persistente), no en FS del contenedor |
| Un solo nodo = punto único de fallo | Baja (aceptable en TFM) | Documentado; healthcheck + restart policy |
| Worker de email caído → leads sin notificar | Media | Worker como servicio con `restart: unless-stopped` + alerta |

---

## FASE 3 — Diseño de infraestructura

### Desarrollo local
Lo que ya usa, sin cambios:
```bash
corepack enable && pnpm install
cp .env.example .env.local   # editar
pnpm dev                     # Next carga .env.local, Turbopack
# opcional: pnpm worker:emails  (procesa la cola de emails)
# DB: Postgres local (Docker) o Neon dev branch
```

### Entorno Development
**Recomendación: NO desplegar un servidor "development" permanente** (ver Fase Staging). Para desarrollo basta local. Si el tribunal quiere ver un entorno no-productivo, se levanta bajo demanda con el mismo compose apuntando a `.env.development`.

### Entorno Staging
**Veredicto: PRESCINDIBLE para este TFM.**
Un staging permanente duplica infraestructura y operación (2× coste, 2× secretos, 2× backups) para atrapar bugs específicos de entorno que, en un proyecto de un solo desarrollador y un solo tenant público, casi no aparecen. El valor no compensa la complejidad.
**Alternativa que sí aporta:** una *preview* efímera bajo demanda (levantar el compose con `APP_ENV=development` contra una DB desechable) para ensayar la demo. Se enciende y se apaga; no es infraestructura permanente.

### Producción — infraestructura recomendada (Professional Minimum Infrastructure)

**Un único VPS pequeño (p. ej. Hetzner CX22, ~4-5 €/mes) con Docker Compose**, detrás de Cloudflare.

```
Internet
  │
Cloudflare (DNS + proxy + CDN + SSL de borde + anti-DDoS)   [plan Free]
  │  (origen oculto)
VPS (1 vCPU / 2-4 GB)
  ├─ Caddy            → TLS automático (Let's Encrypt) + reverse proxy + healthcheck
  ├─ web  (Next standalone, contenedor)      :3000
  ├─ worker (worker:emails, contenedor)      — mismo imagen, comando distinto
  ├─ postgres (contenedor + volumen)         :5432  (solo red interna)
  └─ redis   (contenedor)  — ver nota Upstash vs Redis
Servicios externos:
  ├─ Cloudflare R2   → media/imágenes (S3 SDK ya integrado)   [Free 10 GB]
  ├─ Resend          → email transaccional                     [Free 3k/mes]
  └─ Sentry          → errores + dashboards                     [Free]
Backups: pg_dump nocturno → R2 (mismo bucket u otro).
```

**Por qué esta forma y no Vercel / PaaS:**
- El proyecto **ya declara `output: standalone`** → el Dockerfile estándar de Next aplica casi literal. Coherente con la intención del código.
- Hay **un worker de larga duración**; Vercel no ejecuta procesos persistentes (habría que reescribirlo a Cron Functions). El compose lo corre como un servicio más, sin tocar código.
- Un solo box con compose es **lo más demostrable ante un tribunal**: enseñas Dockerfile, compose, reverse proxy, migraciones en deploy, healthchecks y un pipeline que construiste tú. Es DevOps real y visible, no "magia" del proveedor.
- **Reproducible**: `docker compose up` levanta el sistema completo en cualquier máquina.
- **Barato y sencillo**: una factura, un servidor, un `ssh`.

**Comparativa breve (para justificar en la memoria):**

| Opción | Coste/mes | Complejidad | Worker | Demostrabilidad DevOps | Veredicto TFM |
|--------|-----------|-------------|--------|------------------------|---------------|
| **VPS + Docker Compose** | ~5 € | Media | Nativo (servicio) | **Alta** | ✅ **Elegida** |
| Vercel + Neon | 0-20 € | Baja | Requiere reescritura | Baja | Descartada (oculta el DevOps) |
| Render/Railway (PaaS) | ~7-15 € | Baja-media | Sí (worker service) | Media | Alternativa válida si no quieres gestionar VPS |

Si no quieres administrar un servidor, **Render** es la segunda opción defendible: web service + background worker + Postgres gestionado, con menos que enseñar de infraestructura pero menos superficie de error.

**DNS/SSL/dominios:** dominio en Cloudflare; registro `A` al VPS con proxy activado; Caddy resuelve TLS en el origen (o modo Full/Strict con certificado de origen Cloudflare). CDN y caché de estáticos de Next servidos por Cloudflare.

**Logs/observabilidad:** `docker compose logs` + Sentry (errores) + healthcheck (uptime). Suficiente para un TFM (detalle en Fase 10).

---

## FASE 4 — Estrategia Git

**Estado actual:** `main` + `develop` + 27 ramas `feature/*` (Git Flow ligero).

**Recomendación: GitHub Flow (trunk-based ligero).**
Para un TFM de un desarrollador, Git Flow completo (`develop` + `release/*` + `hotfix/*`) es ceremonia sin retorno: `develop` como rama larga paralela a `main` solo añade merges dobles. **`develop` es prescindible.**

**Ramas:**
| Rama | Propósito | Quién mergea | Cómo |
|------|-----------|--------------|------|
| `main` | Único tronco, siempre desplegable. Protegida. | Solo vía PR | PR verde (CI) + squash merge |
| `feature/NNN-*` | Trabajo de una feature, corta vida | El autor abre PR | Rebase sobre `main` antes de merge |
| `hotfix/*` | Corrección urgente en prod | PR exprés a `main` | Igual que feature, prioridad |

- **Aprobación de PR:** el CI debe pasar (obligatorio). En solitario, self-review disciplinado; documenta el checklist. Branch protection en `main`: require status checks + no push directo.
- **Versionado:** SemVer. `v1.0.0` = versión que defiendes. Tag anotado sobre `main`.
- **Releases/tags:** `git tag -a v1.0.0 -m "..."` → el tag dispara el pipeline de deploy a producción (Fase 6).
- **Changelog:** *Conventional Commits* (ya se usan: `feat:`, `refactor:`, `chore:`) → generar `CHANGELOG.md` automáticamente (p. ej. `git-cliff` o `release-please`) a partir de los mensajes. Bajo coste, alta imagen profesional.
- **Hotfix:** rama desde `main`, fix + test, PR, merge, tag `vX.Y.Z+1`, deploy.

---

## FASE 5 — Integración Continua (CI)

**En cada PR a `main`** (ampliando el `ci.yml` actual, que ya hace lint/typecheck/test/build/guardas):

| Check | Bloquea merge | Ya existe |
|-------|:---:|:---:|
| TypeScript (`tsc --noEmit`) | ✅ | ✅ |
| ESLint (sonarjs + jsx-a11y) | ✅ | ✅ |
| Tests unitarios (Vitest) | ✅ | ✅ |
| Build (`next build`) | ✅ | ✅ |
| Guardas de aislamiento (grep SET LOCAL / raw queries) | ✅ | ✅ |
| **Tests de contrato** (`test:contract`) | ✅ | ➕ añadir |
| **E2E Playwright** (`test:e2e`) | ✅ (o *nightly* si tarda) | ➕ añadir |
| **`pnpm audit` / dependencias vulnerables** | ⚠️ (warn; ✅ para severidad alta) | ➕ añadir |
| Formato Prettier (`--check`) | ✅ | ➕ añadir |
| Coverage | ❌ informativo | opcional |

**Qué bloquea un merge:** cualquier fallo de TS, ESLint, tests (unit + contract), build, guardas de arquitectura, o formato. E2E bloquea si es estable; si es lento, muévelo a un job *nightly* sobre `main`. Coverage se reporta pero no bloquea (evita falsos frenos en TFM).

**Optimización:** cachear pnpm store y `.next/cache`; correr los checks en paralelo (matrix) para PRs rápidos.

---

## FASE 6 — Entrega Continua (CD)

| Evento | Pipeline | Valida | Entorno | Migraciones | Notifica |
|--------|----------|--------|---------|-------------|----------|
| **Push a `feature/*`** | CI calidad | lint/type/test/build/guardas | — | — | Estado del check en el PR |
| **PR → `main`** | CI completo | + contract + e2e + audit + format | — | — | Check en PR (bloqueante) |
| **Merge a `main`** | Build imagen | reconstruye, `docker build`, push a GHCR con tag `sha` | (sin deploy auto) | — | Resumen en Actions |
| **Tag `vX.Y.Z`** | **Deploy prod** | `pg_dump` backup → `db:migrate` → `docker compose up -d` → healthcheck | Producción | Sí, antes de arrancar la web | Éxito/fallo (email/Sentry release) |
| **Hotfix** (tag patch) | Igual que release | Idéntico, prioridad | Producción | Sí | Igual |

**Deploy de producción (job en el tag), paso a paso:**
1. `docker build` imagen `standalone`, push a **GHCR** (GitHub Container Registry, gratis).
2. `ssh` al VPS (clave en `secrets`).
3. `pg_dump` de la DB → volumen/R2 (**backup pre-migración obligatorio**).
4. `docker compose pull` la nueva imagen (web + worker comparten imagen).
5. Ejecutar migraciones: `docker compose run --rm web pnpm db:migrate`.
6. `docker compose up -d` (recrea web y worker con la imagen nueva).
7. **Healthcheck**: esperar `200` en `/api/health` con `env=production`; si falla en N intentos → **rollback automático** al tag anterior.
8. Marcar *release* en Sentry (para asociar errores a la versión).

**`develop` no despliega nada** (por eso se elimina). Toda la entrega cuelga de `main` → tag.

---

## FASE 7 — Base de datos

- **Migraciones:** drizzle-kit, forward-only. `db:generate` en desarrollo (genera SQL desde el schema); `db:migrate` en deploy. Nunca `db:push` en producción (no versiona).
- **Rollback:** drizzle **no genera migraciones *down***. Estrategia real:
  - Cambios **compatibles** (expand): añadir columna nullable / tabla / índice → seguro, no rompe la versión anterior.
  - Cambios **incompatibles** (contract): renombrar/eliminar/NOT NULL → hacerlo en **dos releases** (expand ahora, contract cuando el código viejo ya no corre).
  - Rollback de esquema real = **restaurar el `pg_dump`** previo (por eso es obligatorio en el pipeline).
- **Orden correcto de despliegue:** backup → migrar (expand) → desplegar código → (siguiente release) contract. Nunca desplegar código que exige un esquema aún no migrado.
- **Seeds:** `pnpm db:seed` (`scripts/seed.ts`) solo en local/preview. En producción, seed **controlado** una única vez (crear el tenant público real, `PUBLIC_TENANT_ID`), no datos demo.
- **Backups:** `pg_dump` nocturno (cron en el VPS) → subir a R2, retención 7-30 días. Es tu plan de recuperación ante desastres.
- **Restauración (probada al menos una vez):** `pg_restore` / `psql < dump.sql` sobre una DB limpia; verificar con smoke test. Documenta el tiempo de recuperación.

> ⚠️ Gotcha conocido del proyecto: drift de migraciones Drizzle (p. ej. `slug NOT NULL`). Antes de cada release, `pnpm db:generate` no debe producir cambios (schema y migraciones sincronizados). Añádelo como check.

---

## FASE 8 — Inventario de variables de entorno

| Variable | Local | Dev | Prod | Oblig. | Secreta | Gestiona |
|----------|:---:|:---:|:---:|:---:|:---:|---|
| `APP_ENV` / `NEXT_PUBLIC_APP_ENV` | ✅ | ✅ | ✅ | Sí | No (pública) | Dev |
| `DATABASE_URL` | ✅ | ✅ | ✅ | Sí | **Sí** | Ops |
| `PUBLIC_TENANT_ID` | ✅ | ✅ | ✅ | Sí | No | Dev |
| `AUTH_SECRET` | ✅ | ✅ | ✅ | Sí | **Sí** | Ops |
| `AUTH_URL` | ✅ | ✅ | ✅ | Sí | No | Dev |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | ⚪ | ✅ | ✅ | Sí (dev/prod) | **Sí** | Ops |
| `R2_BUCKET` / `R2_PUBLIC_URL` | ⚪ | ✅ | ✅ | Sí | No | Dev |
| `RESEND_API_KEY` | ⚪ | ✅ | ✅ | Sí (para enviar) | **Sí** | Ops |
| `SENTRY_DSN` | ⚪ | ✅ | ✅ | Recom. | Semi | Ops |
| `RATE_LIMIT_STORE_URL` (+ `_TOKEN`) | ⚪ | ✅ | **✅ crítica** | **Sí en prod** | **Sí** | Ops |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ⚪ | ✅ | ✅ | Recom. | No (pública) | Dev |
| `TURNSTILE_SECRET_KEY` | ⚪ | ✅ | ✅ | Recom. | **Sí** | Ops |
| `NEXT_PUBLIC_SITE_URL` | ✅ | ✅ | ✅ | Sí | No | Dev |
| `WORKER_INTERVAL_MS` | ⚪ | ⚪ | opcional | No | No | Dev |

⚪ = opcional en local (placeholders). **Almacenamiento:** local en `.env.local` (gitignored); en CI/CD como **GitHub Environment secrets**; en el VPS como fichero `.env.production` con permisos `600` **o** inyectadas por el deploy. Las `NEXT_PUBLIC_*` se **incrustan en build** → deben existir en el momento de construir la imagen de cada entorno.

> **Regla dura:** `RATE_LIMIT_STORE_URL` debe estar presente en producción o el rate limiting se apaga en silencio. Trátala como obligatoria y valídala al arrancar.

---

## FASE 9 — Seguridad del despliegue

| Punto | Estado / Acción |
|-------|-----------------|
| Secretos | **Cero secretos en el repo** (verificado). Viven solo en: (a) el VPS, en ficheros `.env.*`/`deploy/env.*` con permisos `600`, contraseñas generadas ahí con `openssl`; (b) GitHub Environment secrets para el CD. El repo solo documenta los *nombres* de variables (`.env.example`). |
| API keys (pública) | Ya con prefijo + hash (`0005_api_key_prefix`). Rate-limit por key. |
| Cloudflare | Proxy activado (oculta IP origen), modo SSL **Full (Strict)**, reglas de firewall básicas. |
| Redis/Upstash | Token secreto; nunca en cliente. Verificar presencia en prod (crítico). |
| Base de datos | Puerto 5432 **solo red interna del compose**, nunca expuesto a Internet. Usuario sin superuser para la app. |
| Cookies/sesión | next-auth JWT, cookies `httpOnly`+`secure` (automático en HTTPS). Verificar `AUTH_URL=https://…`. |
| Cabeceras | HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy ya en `next.config.ts`. ➕ considerar **CSP**. |
| HTTPS | Caddy (Let's Encrypt) + Cloudflare. HSTS preload ya activo. |
| CORS | API v1: permitir solo orígenes esperados; no `*` en endpoints con API key. |
| Rate limiting | Login (middleware) + API pública (por key/IP). **Confirmar store activo en prod.** |
| Anti-bot | Turnstile en formularios públicos (leads). |
| Logs | Sin PII sensible en logs. Sentry con `beforeSend` para scrubbing si hace falta. |
| Backups / DR | `pg_dump` nocturno a R2 + restauración probada. |

---

## FASE 10 — Observabilidad

- **Errores:** Sentry (`@sentry/nextjs`, ya instrumentado) — captura server + client, releases asociadas al tag, alertas por email en errores nuevos. Es tu capítulo de observabilidad "enseñable".
- **Logs:** `docker compose logs -f` (web y worker). Opcional: driver de logs con rotación (`json-file` con `max-size`).
- **Health checks:** `/api/health` → **mejorar** para devolver `{status, env}`; Caddy y el pipeline lo consultan. Monitor de uptime externo gratuito (UptimeRobot / Better Stack) pinga `/api/health` cada 5 min → alerta si cae.
- **Métricas / KPIs técnicos (para la memoria):** tasa de error (Sentry), p95 de respuesta, uptime %, tamaño de la cola `email_queue` (backlog = worker en apuros), nº de rate-limits disparados.
- **Dashboards:** el de Sentry basta para el TFM. No montes Grafana/Prometheus: complejidad alta, retorno bajo para un solo nodo.
- **Alertas:** Sentry (errores) + UptimeRobot (caídas). Suficiente.

---

## FASE 11 — Estrategia de despliegue

**Elegida: Recreate con health check + rollback por tag de imagen.**
En un solo nodo, `docker compose up -d` recrea los contenedores con una ventana de indisponibilidad de segundos (aceptable para un TFM). Es simple, honesto y defendible.

- **Rollback:** las imágenes se etiquetan (`sha`/`vX.Y.Z`) y se conservan en GHCR. Rollback = `docker compose up -d` con el tag anterior. Esquema: si la migración era *expand*, el código viejo sigue funcionando; si fue *contract*, restaurar el `pg_dump`.
- **Upgrade opcional (no necesario en TFM):** Blue/Green ligero = dos contenedores web tras Caddy, cambiar el upstream cuando el nuevo pasa health → cero downtime. Documéntalo como "trabajo futuro"; **no lo implementes** si no lo exige la demo (complejidad no justificada).

Descartadas: **Canary** (sin tráfico real que segmentar), **Rolling multi-nodo** (no hay clúster). Añadirlas sería infraestructura por moda.

---

## FASE 12 — Checklist de Go Live

**Infraestructura**
- [ ] VPS aprovisionado, Docker + Docker Compose instalados, firewall (solo 80/443/22).
- [ ] `Dockerfile` (standalone) + `docker-compose.yml` (web, worker, postgres, redis, caddy) creados y probados en local.
- [ ] GHCR configurado; imagen construida y subida.

**DNS / SSL / Cloudflare**
- [ ] Dominio en Cloudflare, registro `A` → VPS, proxy ON.
- [ ] SSL modo Full (Strict); Caddy emite/renueva certificado.
- [ ] `https://dominio` responde; HSTS presente.

**Base de datos**
- [ ] Postgres de producción arriba (contenedor + volumen persistente).
- [ ] `db:migrate` aplicado; `db:generate` no reporta drift.
- [ ] Seed controlado del tenant público (`PUBLIC_TENANT_ID` real).
- [ ] `pg_dump` nocturno programado (cron) → R2; **restauración probada una vez**.

**Redis / Storage / Email**
- [ ] `RATE_LIMIT_STORE_URL` presente y verificada (rate limiting ACTIVO).
- [ ] R2 prod: bucket, credenciales, `R2_PUBLIC_URL` (CDN) sirviendo imágenes.
- [ ] Resend prod: API key, dominio verificado (SPF/DKIM), envío de prueba OK.
- [ ] Worker de emails corriendo (`restart: unless-stopped`); cola se vacía.

**Variables / Secretos**
- [ ] Todas las variables de Fase 8 definidas en prod (fichero `600` o secrets).
- [ ] `NEXT_PUBLIC_*` correctas **en tiempo de build** de la imagen prod.
- [ ] Secretos rotados respecto a desarrollo.

**Build / CI / CD**
- [ ] CI verde en `main` (lint, type, test, contract, e2e, build, audit, format).
- [ ] Pipeline de tag `vX.Y.Z` probado end-to-end (backup→migrate→up→health→rollback).

**Seguridad**
- [ ] Puerto DB no expuesto. Cabeceras verificadas. CORS de API restringido. Turnstile activo.
- [ ] `/panel` protegido (redirige a login sin sesión) y `noindex`.

**Observabilidad**
- [ ] Sentry recibiendo errores (prueba forzando uno). Release asociada al tag.
- [ ] `/api/health` devuelve `env=production`. UptimeRobot pingando.

**Pruebas / Smoke tests (post-deploy)**
- [ ] Home pública carga; catálogo lista promociones; detalle de inmueble OK.
- [ ] Formulario de contacto → lead creado → email encolado → worker envía.
- [ ] Login backoffice; CRUD de una promoción; subida de imagen a R2.
- [ ] API pública v1 responde con API key; rate limit devuelve 429 al exceder.
- [ ] Sitemap/robots/meta SEO correctos.

**Rollback / Verificación final / Publicación**
- [ ] Rollback ensayado (desplegar tag anterior) y documentado.
- [ ] Backup fresco tomado justo antes de publicar.
- [ ] DNS final propagado; caché Cloudflare purgada.
- [ ] Tag `v1.0.0` creado y desplegado. Changelog generado.

---

## FASE 13 — Roadmap por dependencias

**Ordenado por dependencias (no por importancia). `∥` = paralelizable.**

**Bloque 0 — Correcciones de código (antes de nada)**
1. `/api/health` devuelve `{status, env}`. *(1 línea)*
2. Guarda de arranque: fallar si falta `RATE_LIMIT_STORE_URL` con `APP_ENV=production`.
3. Verificar `db:generate` sin drift.
> Desbloquea: healthcheck fiable y seguridad de rate limiting.

**Bloque 1 — Contenerización** *(depende de 0)*
4. `Dockerfile` standalone (multi-stage). ∥ 5. `docker-compose.yml` (web, worker, postgres, redis, caddy).
6. `docker compose up` funciona en local con `.env` de prueba.
> Bloquea todo el CD.

**Bloque 2 — Infraestructura base** *(∥ con Bloque 1)*
7. VPS + Docker. ∥ 8. Cloudflare (DNS). ∥ 9. R2 prod, Resend prod, Sentry prod, Upstash prod (crear proyectos + credenciales).
> Bloquea el primer deploy real.

**Bloque 3 — CI ampliado** *(depende de 0; ∥ con 1-2)*
10. Añadir a `ci.yml`: contract, e2e, `pnpm audit`, prettier check.
> Bloquea la protección de `main`.

**Bloque 4 — Datos** *(depende de 2)*
11. Postgres prod + `db:migrate`. 12. Seed del tenant público. 13. Cron `pg_dump`→R2 + **probar restauración**.
> Bloquea el go-live (sin backup no se publica).

**Bloque 5 — CD** *(depende de 1, 2, 3)*
14. Build+push a GHCR en merge a `main`. 15. Pipeline de tag: backup→migrate→up→health→rollback.
> Bloquea el deploy reproducible.

**Bloque 6 — Git/Release** *(depende de 3)*
16. Branch protection en `main`, eliminar `develop`. ∥ 17. Conventional commits + changelog automático.

**Bloque 7 — Observabilidad** *(depende de 2)*
18. Verificar Sentry en prod. ∥ 19. UptimeRobot sobre `/api/health`.

**Bloque 8 — Go Live** *(depende de TODOS)*
20. Checklist Fase 12 completo. 21. Smoke tests. 22. Tag `v1.0.0` + deploy. 23. Verificación final + publicación.

**Camino crítico:** 0 → 1 → 2 → 4 → 5 → 8. Los bloques 3, 6, 7 corren en paralelo al camino crítico.

---

## Clasificación de servicios (¿mantener o simplificar?)

| Servicio | Veredicto | Justificación | Alternativa más simple |
|----------|-----------|---------------|------------------------|
| **PostgreSQL** | **Imprescindible** | Núcleo de datos y multi-tenant. | Autohospedado en compose (elegido, $0, demostrable) *o* Neon Free (offload de backups). |
| **Cloudflare R2** | **Imprescindible / mantener** | Persistencia de imágenes entre deploys + CDN + sin coste de egress + S3 SDK **ya integrado**. Es el único SaaS externo que claramente se gana su sitio. | Volumen local en VPS (una dependencia menos, pero pierdes CDN, durabilidad y añades backup del volumen). No recomendado. |
| **Resend** | **Recomendable / mantener** | Free tier suficiente; la parte demostrable es la **cola + worker**, Resend es solo el transporte. Dominio verificado da entregabilidad real. | Cualquier SMTP; o modo "log" para la demo. Mantener Resend. |
| **Upstash Redis** | **Recomendable (mantener Free) / Sustituible** | Cliente **HTTP** serverless, zero-ops, gratis, ya integrado. Autohospedar Redis exige un proxy SRH → añade más complejidad de la que quita. | **Minimalista:** limiter **en memoria** (correcto en instancia única; se pierde al reiniciar, aceptable para ventanas de minutos) → elimina el SaaS pero requiere cambio de código. |
| **Sentry** | **Recomendable / mantener** | Observabilidad "de tribunal" real (dashboards, alertas, releases) por $0, ya cableado. La observabilidad es eje de evaluación. | Logs de Docker + healthcheck (cubre el mínimo). Prescindible si se busca máxima simplicidad, pero **merece la pena conservarlo**. |
| **Cloudflare Turnstile** | **Recomendable / Sustituible** | Anti-bot real en formularios de lead, gratis, ya codificado. | **Honeypot** (campo trampa): cero dependencias externas, más simple. Válido si quieres reducir servicios. |
| **Cloudflare (DNS/CDN/SSL)** | **Recomendable / mantener** | Free; DNS + proxy + CDN + anti-DDoS + oculta IP origen, casi sin complejidad. | Solo Caddy (Let's Encrypt) da HTTPS de origen sin CDN. Cloudflare aporta mucho por poco. |
| **Docker + Compose** | **Imprescindible (añadir)** | Es la pieza que **falta**. `output: standalone` ya lo pide. Sin esto no hay deploy reproducible ni CD. | — |
| **GitHub Actions** | **Imprescindible / ampliar** | CI ya funciona; falta CD. Gratis para repos personales. | — |

### Professional Minimum Infrastructure (resumen)

> **Un VPS + Docker Compose (web + worker + Postgres + Redis + Caddy), tras Cloudflare, con R2 + Resend + Sentry externos (todos free tier), CI/CD en GitHub Actions con deploy por tag, backups `pg_dump`→R2.**

Es la solución **más sencilla** que:
- despliega el proyecto **tal cual está** (respeta `standalone` y el worker), sin reescribir código;
- conserva **todas** las funcionalidades y la seguridad implementadas;
- se demuestra íntegra ante un tribunal (`docker compose up`, un pipeline propio, migraciones y backups visibles);
- cuesta **~5 €/mes** y es completamente reproducible.

**Simplificaciones opcionales** si quieres reducir aún más servicios externos (a coste de código o de features): Upstash → limiter en memoria; Turnstile → honeypot; Sentry → solo logs. Ninguna es necesaria; las tres piezas se ganan su sitio en el free tier.

---

## Adenda (2026-07-13) — hallazgos de la auditoría de Docker/datos e implementación

### Decisión de entornos revisada: `develop → Development`, `main → Producción`
Se adopta un flujo de **dos entornos con auto-deploy** (más ordenado y ya soportado por el código, que tiene `APP_ENV=development`):
- `feature/*` → solo CI.
- `develop` → merge → **auto-deploy a Development** (datos de prueba, simula prod).
- `main` → merge → **auto-deploy a Producción**.
No es Git Flow pesado (sin `release/*`/`hotfix/*` ceremoniales): son dos ramas *desplegables* que espejan dos entornos. Ambos corren en **un único VPS** como dos stacks compose aislados (`domio-dev`, `domio-prod`) tras un Caddy compartido.

### Hallazgos nuevos (no visibles hasta inspeccionar Docker)
1. **Los ficheros Docker nunca existieron en git** (ni compose ni Dockerfile, en ningún commit/stash/rama ni en disco). El Postgres local se arrancó con un `docker run` manual. → No había nada que recuperar; se han **creado desde cero**.
2. **PostGIS es obligatorio y ninguna migración crea la extensión.** `promociones.location`/`location_approx` son `geometry(Point,4326)` con índice GiST. Imagen requerida: `postgis/postgis:16-3.4`. Se añade `deploy/init-postgis.sql` (`CREATE EXTENSION postgis`) porque un Postgres limpio falla en la migración `0000`.
3. **Datos en un volumen ANÓNIMO frágil** (`docker run` sin `-v` nombrado). Se han respaldado a `backups/` y el nuevo compose usa un **volumen nombrado** (`pgdata`).
4. **Drift de migraciones:** la BD local está en la migración **4** (faltan `0004`→`0007`). Plan de migración de datos: construir esquema limpio con las 8 migraciones en el destino y cargar **solo datos de aplicación** (las columnas nuevas son nullable → sin conflicto).
5. **Bug en la migración `0007`:** re-añade `api_keys.key_prefix` que ya crea la `0005` → `pnpm db:migrate` sobre una base limpia fallaba con *"column already exists"* (verificado). **Corregido** con `ADD COLUMN IF NOT EXISTS`.

### Artefactos creados
| Fichero | Qué es |
|---------|--------|
| `Dockerfile` | Multi-stage: `runner` (web standalone) + `tools` (worker + migraciones/seed) |
| `.dockerignore` | Contexto de build mínimo |
| `deploy/docker-compose.app.yml` | Stack app (postgres+web+worker), parametrizado; se lanza como `domio-dev` y `domio-prod` |
| `deploy/docker-compose.proxy.yml` + `deploy/Caddyfile` | Caddy compartido, TLS automático, enruta por dominio |
| `deploy/init-postgis.sql` | Crea la extensión PostGIS al inicializar el volumen |
| `deploy/env.{prod,dev,proxy}` | **Se crean en el VPS** (ver `deploy/README.md`), nunca en el repo; contraseñas generadas con `openssl` en el propio servidor |
| `deploy/Makefile` | `proxy-up`, `dev-up`, `prod-up`, `*-migrate`, `logs-*`, `backup` |
| `deploy/scripts/migrate-data.sh` | Migra los datos reales a un entorno (migraciones + carga data-only) |
| `deploy/README.md` | Guía operativa paso a paso |
| `.github/workflows/cd.yml` | CD: build de 2 imágenes a GHCR + deploy por SSH con backup→migrate→up→healthcheck→rollback |

### Correcciones de código aplicadas (Bloque 0)
- `app/api/health/route.ts`: devuelve `{status, env}` (verificación de deploy).
- `instrumentation.ts`: **fail-fast** si falta `RATE_LIMIT_STORE_URL` con `APP_ENV=production` (evita rate limiting desactivado en silencio).
- `src/infrastructure/db/migrations/0007_early_deadpool.sql`: `ADD COLUMN IF NOT EXISTS` (arregla el fallo de `db:migrate` limpio).

### Estado de validación
- `docker compose config` → **OK** en app y proxy. `docker build --check` → **sin avisos**.
- Backups de los datos reales tomados: `backups/domio_full_*.dump`, `domio_appdata_*.dump`.
- Pendiente (requiere infra real): build+push de imágenes, provisión del VPS, primer deploy y smoke tests.
