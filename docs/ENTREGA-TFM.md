# Domio — Documento maestro de entrega (TFM)

> Documento único que consolida **arquitectura, infraestructura, servicios externos,
> gestión de secretos, CI/CD, seguridad, backups y observabilidad**, con el plan de
> acción ordenado para dejarlo todo a punto y entregar.
>
> Documentos complementarios (anexos): [`DESPLIEGUE.md`](DESPLIEGUE.md) (guía técnica de
> despliegue), [`PLAN-MANANA.md`](PLAN-MANANA.md) (plan operativo), [`PLAN-PRUEBAS-TFM.md`](PLAN-PRUEBAS-TFM.md)
> (batería de pruebas funcional/UX), [`../deploy/README.md`](../deploy/README.md) (operación del VPS).

---

## 0. Estado actual

- **Desplegado y funcionando**: producción (`wedomio.com`) + desarrollo (`dev.wedomio.com`)
  en un VPS Hetzner, con 2 stacks Docker Compose + Caddy, TLS Let's Encrypt, datos reales
  cargados (9 promociones, 39 unidades, 5 usuarios, 7 leads), contraseña de admin propia,
  y **cero secretos en el repositorio**.
- **Pendiente para cerrar**: verificar servicios externos uno a uno, rematar el fix de R2,
  activar el CI/CD con secretos en GitHub, y endurecer la seguridad.

---

## 1. Arquitectura e infraestructura

```
                      ┌─────────────── Cloudflare (proxy naranja) ──────────────┐
   Usuario  ─HTTPS─►  │  DNS · CDN · WAF/DDoS · SSL de borde · Turnstile · R2    │
                      └───────────────────────────┬─────────────────────────────┘
                                                  │  (IP de origen oculta)
                     VPS Hetzner (195.201.96.67) · Ubuntu · Docker
                     ┌──────────────────────────────────────────────────────┐
                     │ Caddy :80/:443  — TLS (Let's Encrypt) + reverse proxy │
                     │   ├── wedomio.com      → domio-prod-web:3000          │
                     │   └── dev.wedomio.com  → domio-dev-web:3000           │
                     │                                                       │
                     │   Stack PROD (domio-prod)     Stack DEV (domio-dev)   │
                     │   ├─ web    (Next standalone, :3000)                  │
                     │   ├─ worker (procesa email_queue)                     │
                     │   └─ postgres + PostGIS (volumen nombrado, loopback)  │
                     └──────────────────────────────────────────────────────┘
   Servicios externos (SaaS, free tier):
     Cloudflare R2 (imágenes) · Resend (email) · Sentry (errores) · Upstash (rate limit)
   Registro de imágenes:  GHCR · ghcr.io/darjav95dev-master/domio-{web,tools}
   CI/CD:  GitHub Actions  (develop → dev · main → prod)
```

**Responsabilidades:**
- **Cloudflare** — borde: DNS, CDN, WAF/DDoS, TLS de borde, oculta el origen; aloja R2 y Turnstile.
- **Caddy** — termina TLS en el origen y enruta por dominio al contenedor web de cada entorno.
- **web** — Next.js 15 (App Router, standalone, SSR).
- **worker** — procesa la cola `email_queue` y envía por Resend.
- **postgres + PostGIS** — datos y aislamiento multi-tenant (RLS con `SET LOCAL`).
- **SaaS externos** — almacenamiento, email, observabilidad y rate limiting.

**Decisiones de diseño (justificación TFM):** 1 VPS + Docker Compose (no Vercel) porque hay
un worker de larga duración y el proyecto ya declara `output: standalone`; es reproducible
(`docker compose up`), barato (~5 €/mes) y demostrable de principio a fin. Servicios externos
solo donde aportan (durabilidad/CDN de R2, entregabilidad de Resend, dashboards de Sentry,
estado compartido de Upstash), todos en *free tier*.

---

## 2. Servicios externos — dejar cada uno "a punto"

Para cada servicio: **rol · integración en código · configuración · prueba de conexión ·
prueba funcional · endurecimiento · evidencia para el TFM.**

### 2.1 Cloudflare R2 — almacenamiento de imágenes *(rematar el fix)*
- **Rol:** imágenes subidas desde el backoffice; se sirven por `cdn.wedomio.com`.
- **Código:** `src/infrastructure/media/r2-client.ts` (S3Client, endpoint
  `<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`), `media.service.ts`
  (`uploadImage`/`delete`/`signedReadUrl`), `public-url.ts`. Env: `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
- **Config:** buckets `domio-prod` / `domio-dev` con dominio público
  (`cdn.wedomio.com` / `cdn-dev.wedomio.com`) y token R2 (Object Read & Write).
- **Prueba conexión:** subir imagen en el panel → aparece el objeto en Cloudflare → R2.
- **Prueba funcional:** que esa imagen **se vea** en la web pública.
- **⚠️ FIX obligatorio (integración correcta):** `next.config.ts` calcula el hostname
  permitido de imágenes con `R2_PUBLIC_URL` **en build**; no se pasó como build-arg →
  quedó `placeholder.com` y Next rechaza `cdn.wedomio.com`. Acciones:
  1. `Dockerfile` (stage builder): añadir `ARG R2_PUBLIC_URL` + `ENV R2_PUBLIC_URL=$R2_PUBLIC_URL`.
  2. Pasar `--build-arg R2_PUBLIC_URL=https://cdn.wedomio.com` (prod) / `.../cdn-dev...` (dev)
     en el build manual **y** en `cd.yml`.
  3. Rehacer y subir la imagen web, redeploy, y verificar que una imagen subida se ve.
- **Nota:** las 54 imágenes del catálogo actual son URLs de Unsplash (no dependen de R2).
- **Evidencia TFM:** objeto en R2 + imagen renderizada + fragmento de `r2-client.ts`.

### 2.2 Resend — email transaccional *(dominio verificado ✅)*
- **Rol:** notificar leads; arquitectura desacoplada **cola (`email_queue`) + worker con reintentos**.
- **Código:** `src/infrastructure/email/resend.client.ts` (from `noreply@wedomio.com`),
  `worker-handler.ts`, `scripts/worker-emails.ts`. Env: `RESEND_API_KEY`.
- **Config:** dominio `wedomio.com` verificado en Resend (SPF/DKIM en Cloudflare) — hecho.
- **Prueba conexión + funcional:** formulario de contacto → lead → `docker logs
  domio-prod-worker-1` (envío) → `select status,count(*) from email_queue group by status`
  (`sent`, sin `failed`) → email recibido, no en spam.
- **Endurecimiento:** vigilar backlog de la cola; DMARC opcional.
- **Evidencia TFM:** diagrama cola→worker→Resend + captura del email + estado de la cola.

### 2.3 Sentry — observabilidad de errores
- **Rol:** errores server+cliente, releases, alertas.
- **Código:** `sentry.server.config.ts`, `sentry.client.config.ts`, `instrumentation.ts`
  (init con `SENTRY_DSN`), `src/infrastructure/observability/sentry-common.ts`, `sentry.wrapper.ts`.
- **Prueba conexión + funcional:** ruta temporal `app/api/debug-error/route.ts` que lance →
  desplegar en **dev** → visitarla → evento en el dashboard con `environment` + release →
  **borrarla** antes de main.
- **Endurecimiento:** confirmar scrubbing de PII (`beforeSend`), alerta por email, DSN de
  prod y dev separados.
- **Evidencia TFM:** captura del dashboard con el evento, entorno y release.

### 2.4 Upstash Redis — rate limiting
- **Rol:** contadores de rate limit (login + API pública).
- **Código:** `redis-client.ts` (cliente **HTTP** Upstash), `rate-limiter.ts` (sliding window),
  `rate-limiter.factory.ts`. **Clave:** sin `RATE_LIMIT_STORE_URL` → `NoopRateLimiter`
  (permite todo); por eso `instrumentation.ts` tiene guarda **fail-fast** en producción.
- **Prueba conexión + funcional:** `for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}\n"
  https://wedomio.com/api/v1/promociones; done` → aparece **429** (activo, no no-op).
- **Endurecimiento:** revisar límites por endpoint/rol; base Upstash de prod y dev separadas.
- **Evidencia TFM:** captura del 429 + fragmento de la factory explicando el fail-fast.

### 2.5 Cloudflare Turnstile — anti-bot
- **Rol:** proteger formularios públicos de spam.
- **Código:** widget con `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; verificación servidor con
  `TURNSTILE_SECRET_KEY` contra `siteverify`.
- **Prueba conexión + funcional:** widget visible · envío legítimo pasa · envío sin token se rechaza.
- **Evidencia TFM:** captura del widget + rechazo sin token.

### 2.6 Cloudflare — DNS / CDN / TLS
- **Prueba:** `dig +short wedomio.com` → IPs de Cloudflare (naranja); `curl -I https://wedomio.com`
  → 200 + HSTS + cabeceras; certificado válido.
- **Endurecimiento:** modo **Full (Strict)**; firewall del VPS que solo acepte 80/443 desde
  IPs de Cloudflare; plan futuro **Origin Certificate** para la renovación del cert en naranja.

### 2.7 PostgreSQL + PostGIS *(autohospedado)*
- **Código:** `pg` Pool + Drizzle; migraciones versionadas; extensión creada por
  `deploy/init-postgis.sql`; aislamiento multi-tenant con `SET LOCAL` (guardas en CI).
- **Prueba:** `/api/health` + recuentos ya verificados.
- **Endurecimiento:** puerto solo en loopback (túnel SSH para DBeaver); backups (§6).

---

## 3. Gestión de secretos y configuración

**Principio (aplicado): cero secretos en el repositorio.** Viven en tres sitios:

| Dónde | Qué | Cómo |
|---|---|---|
| **VPS** `/opt/domio/.env.{production,development}` + `deploy/env.{prod,dev,proxy}` | R2, Resend, Sentry, Upstash, Turnstile, `AUTH_SECRET`, password de Postgres | ficheros `chmod 600`; contraseñas generadas con `openssl` en el servidor |
| **GitHub → Environments** | lo que necesita el pipeline: SSH + build-args públicos | Settings → Environments (§4.3) |
| **VPS (docker login)** | PAT de GHCR (`read:packages`) para `docker pull` | `docker login ghcr.io` |

Las `NEXT_PUBLIC_*` se incrustan en **build** (por eso van como build-arg / variable de
GitHub, no como secreto de runtime). Inventario completo de variables en
[`DESPLIEGUE.md`](DESPLIEGUE.md) Fase 8 y en `.env.example`.

---

## 4. Integración y entrega continua (CI/CD)

### 4.1 CI — `.github/workflows/ci.yml` (en cada PR a `main`)
TypeScript · ESLint · tests · build · guardas de aislamiento (grep `SET LOCAL` / no queries
crudas fuera de repositorios). Ampliable: contract tests, e2e, `pnpm audit`, prettier.
Un fallo **bloquea** el merge.

### 4.2 CD — `.github/workflows/cd.yml` (`develop → dev`, `main → prod`)
1. **build-and-push:** construye 2 imágenes (`domio-web` target `runner` + `domio-tools`
   target `tools`) con los `NEXT_PUBLIC_*` (**añadir `R2_PUBLIC_URL`**, §2.1); push a GHCR con
   tag por rama (`develop`/`latest`) + `sha`.
2. **deploy (SSH):** `git pull` → `pg_dump` (backup) → `db:migrate` → `docker compose up -d`
   → **healthcheck** → **rollback** al tag anterior si falla.

### 4.3 Activación (pasos)
1. **GitHub → Settings → Environments** → crear `production` y `development`:

   | Entorno | Tipo | Nombre | Valor |
   |---|---|---|---|
   | production | Secret | `SSH_HOST` | `195.201.96.67` |
   | production | Secret | `SSH_USER` | `deploy` |
   | production | Secret | `SSH_KEY` | *(clave privada `~/.ssh/domio_deploy` completa)* |
   | production | Secret | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *(site key)* |
   | production | Variable | `NEXT_PUBLIC_APP_ENV` | `production` |
   | production | Variable | `NEXT_PUBLIC_SITE_URL` | `https://wedomio.com` |
   | development | *(igual)* | … | mismo VPS/clave; `NEXT_PUBLIC_APP_ENV=development`, `NEXT_PUBLIC_SITE_URL=https://dev.wedomio.com` |

   R2/Resend/Sentry/Upstash **NO** van aquí (viven en el VPS). `GITHUB_TOKEN` lo inyecta GitHub.
2. **VPS en `main`:** `cd /opt/domio && git checkout main && git pull` (los compose son
   idénticos en ambas ramas; el tag de imagen diferencia entornos).
3. **Probar:** push a `develop` → deploy dev; merge a `main` → deploy prod.
4. **Probar rollback:** forzar fallo de healthcheck → vuelve al tag anterior.
- **Evidencia TFM:** run verde de Actions (build + deploy) y del rollback.

### 4.4 Estrategia Git
GitHub Flow de 2 ramas desplegables: `feature/*` (solo CI) → `develop` (auto-deploy dev) →
`main` (auto-deploy prod, tag de release). Versionado SemVer; changelog por Conventional Commits.

---

## 5. Seguridad (endurecimiento final)
- Cloudflare **naranja + Full (Strict)** (ocultar origen).
- **Firewall** VPS: 80/443 solo desde IPs de Cloudflare; 22 restringido.
- **SSH:** `PermitRootLogin no`, `PasswordAuthentication no` (solo clave) — tras confirmar acceso por clave.
- **Usuarios demo:** rotar/desactivar los 4 restantes (aún `Domio2026!`).
- **Cabeceras** (ya): HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy; valorar **CSP**.
- **RGPD:** banner de consentimiento, ARSOP (derechos), scrubbing de PII en Sentry, backups cifrados.

---

## 6. Backups y recuperación ante desastres
- **Backup:** `pg_dump` nocturno (cron) → subir a R2; retención 7–30 días (`make -f deploy/Makefile backup`).
- **Restauración probada** al menos una vez (documentar tiempo de recuperación).
- **Rollback de esquema:** migraciones expand/contract (forward-only); rollback real = restaurar dump.
- **Evidencia TFM:** log del cron + prueba de restauración.

---

## 7. Observabilidad
- **Errores:** Sentry (dashboards, releases, alertas).
- **Logs:** `docker compose logs` (rotación `json-file`).
- **Health:** `/api/health` (con `env`) + monitor de uptime externo (UptimeRobot).
- **KPIs técnicos:** tasa de error, p95, uptime %, backlog de `email_queue`, nº de 429.

---

## 8. Roadmap ordenado por dependencias

```
FASE 1 — Servicios externos
  1. R2  → subir imagen → (FIX build-arg R2_PUBLIC_URL) → verla en web     [crítico]
  2. Resend → formulario → worker → sent → email recibido
  3. Sentry → /api/debug-error en dev → evento → borrar ruta
  4. Upstash → bucle → 429
  5. Turnstile → widget + rechazo sin token
  6. Cloudflare → naranja + Full(Strict) + dig + cabeceras
FASE 2 — Integración continua
  7. GitHub Environments (secrets + vars)                                  [crítico]
  8. VPS en main
  9. Push develop → deploy dev   10. Merge main → deploy prod   11. Rollback
FASE 3 — Cierre
  12. Hardening (SSH, firewall, usuarios)   13. dev noindex   14. Backups cron
  15. Evidencias + diagramas + repaso final
```
**Ruta crítica:** 1(+fix) → 2 → 3 → 4 → 7 → 8 → 9 → 10.

---

## 9. Checklist de entrega TFM
- [ ] Diagrama de arquitectura (§1, pulido).
- [ ] Tabla de servicios externos: rol · alternativa · justificación de la elección.
- [ ] Inventario de variables/secretos y su gestión (§3).
- [ ] Capturas de cada servicio funcionando (R2, email, Sentry, 429, Turnstile).
- [ ] Captura de Actions (CI verde + CD deploy + rollback).
- [ ] Estrategia Git y de migraciones.
- [ ] Plan de backups + prueba de restauración.
- [ ] Checklist de seguridad (cabeceras, TLS, RGPD, hardening).
- [ ] Anexos: `DESPLIEGUE.md`, `PLAN-MANANA.md`, `PLAN-PRUEBAS-TFM.md`, `deploy/README.md`.
