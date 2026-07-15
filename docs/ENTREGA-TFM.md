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
  cargados (9 promociones, 39 unidades, usuarios, 10 leads), contraseña de admin propia,
  y **cero secretos en el repositorio**.
- **Verificado ✅**: los 6 servicios externos, uno a uno, ejercitados con los clientes reales
  (`scripts/check-services.ts` → todo OK). Cada uno tenía la integración rota en silencio
  (build-args ausentes, un bug de mapeo que impedía todo email, el SDK de navegador de Sentry
  sin arrancar, un stale closure en Turnstile); todos corregidos y probados (§2).
- **Seguridad cerrada ✅**: origen oculto (firewall Hetzner), SSH solo-clave sin root, cuentas
  demo desactivadas, dev no indexable. Backups automatizados con restauración probada (§5, §6).
- **Pendiente**: activar el CI/CD (§4), aplicar RLS con un rol de Postgres sin privilegios
  (ahora la app conecta como superusuario → el RLS no se aplica en producción), y remates
  menores (cloud-init `ssh_pwauth`, `cdn.wedomio.com`, subir backups a R2).

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
- **Cloudflare** — borde: DNS, CDN, WAF/DDoS, TLS de borde, **firewall que oculta el origen**
  (Hetzner Cloud Firewall: 80/443 solo desde rangos de Cloudflare); aloja R2 y Turnstile.
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

### 2.1 Cloudflare R2 — almacenamiento de imágenes *(verificado ✅)*
- **Rol:** imágenes subidas desde el backoffice; se sirven por la Public Development
  URL de R2 (`pub-<hash>.r2.dev`).
- **Código:** `src/infrastructure/media/r2-client.ts` (S3Client, endpoint
  `<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`), `media.service.ts`
  (`uploadImage`/`delete`/`signedReadUrl`), `public-url.ts`. Env: `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
- **Config:** buckets `domio-prod` / `domio-dev`, cada uno con su Public URL
  `pub-<hash>.r2.dev` y token R2 (Object Read & Write).
- **Prueba (verificada):** `check-services` ejercita put/get/delete con `r2Client` y
  comprueba el acceso público por HTTP → `bucket=domio-prod · put/get/delete=OK · público=OK`.
- **FIX aplicado (era la causa de que las imágenes no cargaran):** `next.config.ts`
  calcula el hostname permitido de imágenes con `R2_PUBLIC_URL` **en build**, pero no se
  pasaba como build-arg → la imagen quedaba con `placeholder.com` y Next rechazaba el CDN.
  Resuelto: `ARG R2_PUBLIC_URL` en el `Dockerfile`, y `R2_PUBLIC_URL` añadido a los
  build-args del `Makefile` (target `build-%`) y de `cd.yml`.
- **Nota:** las imágenes del catálogo actual son URLs de Unsplash (no dependen de R2).
- **Pendiente (opcional):** dominio propio `cdn.wedomio.com` como Custom Domain del bucket.
  La URL `r2.dev` funciona pero Cloudflare la desaconseja para producción (sin caché de CDN,
  límites de ancho de banda). Requiere rebuild (el hostname se hornea en `next.config`).
- **Evidencia TFM:** salida ✅ de `check-services` + imagen renderizada + fragmento de `r2-client.ts`.

### 2.2 Resend — email transaccional *(verificado ✅ · email recibido)*
- **Rol:** notificar leads; arquitectura desacoplada **cola (`email_queue`) + worker con reintentos**.
- **Código:** `src/infrastructure/email/resend.client.ts` (from `noreply@wedomio.com`),
  `worker-handler.ts`, `scripts/worker-emails.ts`. Env: `RESEND_API_KEY`.
- **Config:** dominio `wedomio.com` verificado en Resend (SPF/DKIM en Cloudflare) — hecho.
- **FIX crítico aplicado (ningún email de lead se había enviado nunca):** el worker leía
  `row.toEmail`, pero `EmailRepository.findPendingEligible` consultaba con SQL crudo
  (`SELECT *`) y devolvía las columnas en snake_case (`to_email`), con un cast
  `as unknown as EmailQueue[]` que engañaba a TypeScript. `toEmail` llegaba `undefined` y
  Resend rechazaba cada envío con `Missing 'to' field`. Resuelto usando el query builder de
  Drizzle (mapea las columnas de verdad) + test contra Postgres real. El bug había
  sobrevivido porque los tests de la cola mockeaban justo esa función.
- **Prueba (verificada):** formulario de la ficha de inmueble → lead → worker envía →
  `email_queue` en `sent` → **dos emails recibidos** (confirmación al lead + notificación al
  agente). Alternativa: `check-services` (envío directo por el cliente Resend).
- **Endurecimiento:** vigilar backlog de la cola; DMARC opcional.
- **Evidencia TFM:** diagrama cola→worker→Resend + captura del email recibido + estado de la cola.

### 2.3 Sentry — observabilidad de errores *(verificado ✅ · server + cliente)*
- **Rol:** errores server+cliente, releases, alertas.
- **Código:** `sentry.server.config.ts`, `instrumentation-client.ts` (antes
  `sentry.client.config.ts`), `instrumentation.ts` (init + `onRequestError`),
  `src/infrastructure/observability/sentry-common.ts`, `sentry.wrapper.ts`.
- **FIX (tres fallos; Sentry apenas reportaba):**
  1. `environment` salía de `NODE_ENV`, que vale `production` en dev **y** en prod (ambos
     corren un build de producción) → los eventos de dev llegaban etiquetados como prod.
     Resuelto usando `APP_ENV`. Igual para `tracesSampleRate`.
  2. El SDK del **navegador** nunca arrancaba: `sentry.client.config.ts` solo se inyecta con
     `withSentryConfig`, que no se usaba. Renombrado a `instrumentation-client.ts` (Next 15
     lo carga nativo) + `NEXT_PUBLIC_SENTRY_DSN` como build-arg. Ningún error de navegador
     había llegado nunca a Sentry.
  3. Faltaba el hook `onRequestError` en `instrumentation.ts`: sin él, Next se traga los
     errores de servidor y no los reporta. Añadido.
  - Además: `release` = sha del commit, incrustada en build.
- **Prueba (verificada):** `dev.wedomio.com/api/debug-error` (500 a propósito) → evento en el
  dashboard con `environment=development` y `release`. Cliente vivo: `window.__SENTRY__` es
  `object` con `environment` correcto. En prod la ruta devuelve **404** (blindada), así que no
  hay que "borrarla antes de main": es inofensiva. Verificación de prod: evento enviado desde
  el SDK del navegador de `wedomio.com` (aceptado, `environment=production`).
- **Endurecimiento:** scrubbing de PII (`beforeSend`) ✅ · alerta por email ante error nuevo ✅ ·
  **un solo proyecto Sentry** segmentado por `environment` (decisión: los DSN de prod y dev son
  el mismo; con el `environment` ya correcto, se filtra por entorno en el dashboard).
- **Evidencia TFM:** captura del dashboard con el evento, `environment`, `release` y la alerta.

### 2.4 Upstash Redis — rate limiting *(verificado ✅ · 429 capturado)*
- **Rol:** contadores de rate limit (login por IP + API pública por API key).
- **Código:** `redis-client.ts` (cliente **HTTP** Upstash), `rate-limiter.ts` (sliding window),
  `rate-limiter.factory.ts`. **Clave:** sin `RATE_LIMIT_STORE_URL` → `NoopRateLimiter`
  (permite todo); por eso `instrumentation.ts` tiene guarda **fail-fast** en producción.
- **Prueba conexión (verificada):** `check-services` hace set/get real contra Redis y comprueba
  que el limitador NO es `NoopRateLimiter` → `set/get=OK · limiter=UpstashRateLimiter`.
- **Prueba funcional (verificada):** el rate limit de la API pública se cuenta **por API key**,
  y la autenticación corre **antes** que el rate limiter (ver test
  `api-v1-rate-limit-auth-order`). Por eso un bucle de `curl` sin clave da siempre `401`, nunca
  `429`. Prueba correcta: crear una API key con `rateLimitPerMin` bajo (p. ej. 5) desde el panel
  y machacar `/api/v1/promociones` con la cabecera `x-api-key` → se observa el salto
  `200…200 → 429`. *(Nota: la versión anterior de este documento proponía un bucle sin API key,
  que no puede producir 429 por el orden auth→rate-limit.)*
- **Endurecimiento:** revisar límites por endpoint/rol; base Upstash de prod y dev separadas.
- **Evidencia TFM:** captura del `429` (con API key) + fragmento de la factory explicando el fail-fast.

### 2.5 Cloudflare Turnstile — anti-bot *(verificado ✅)*
- **Rol:** proteger formularios públicos de spam.
- **Código:** `TurnstileWidget` con `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; verificación servidor con
  `TURNSTILE_SECRET_KEY` contra `siteverify`.
- **FIX (dos fallos que hacían el formulario de leads inservible):**
  1. El site key no se pasaba como build-arg → el widget se autodesactivaba y el formulario
     era imposible de enviar. Resuelto (build-arg + guard del Makefile que falla si falta).
  2. `ContactForm` (ficha de inmueble) memoizaba `handleSubmit` con deps `[promocionId]`:
     capturaba `turnstileToken=null` en el primer render y nunca se recreaba (*stale closure*).
     El widget mostraba "Operación exitosa" pero la acción enviaba `undefined` → el servidor
     respondía "Debes completar la verificación" de forma permanente. Resuelto añadiendo la
     dependencia. Causa de fondo: `eslint-plugin-react-hooks` no estaba en la config, así que
     `exhaustive-deps` no corría; se activó (encontró y se corrigieron 2 casos más).
  - Además: widget con `size: "flexible"` (se adapta al ancho del formulario).
- **Prueba (verificada):** widget visible y con token real de Cloudflare en dev · envío sin
  token rechazado por `siteverify` · secret válido en `check-services`.
- **Evidencia TFM:** captura del widget + rechazo sin token.

### 2.6 Cloudflare — DNS / CDN / TLS *(verificado ✅ · origen oculto)*
- **Prueba (verificada):** `dig +short wedomio.com` → IPs de Cloudflare (`188.114.x`, naranja);
  `curl -I https://wedomio.com` → 200 + HSTS + X-Frame-Options + nosniff + Referrer-Policy +
  Permissions-Policy; certificado válido.
- **Origen oculto (hecho y verificado):** el firewall bloquea 80/443 salvo desde los 15 rangos
  IPv4 de Cloudflare. Antes, `--resolve wedomio.com:443:195.201.96.67` devolvía **200**
  (se saltaba Cloudflare); ahora **da timeout**, mientras la web por Cloudflare sigue en 200.
  - **Hallazgo relevante:** se intentó primero con `ufw` en el VPS y **no funcionó** aunque las
    reglas parecían correctas: Caddy corre en Docker, y **Docker inserta sus reglas de iptables
    por debajo de `ufw`**, saltándose su filtrado (gotcha conocido). La solución fue subir el
    firewall al **borde de red del proveedor (Hetzner Cloud Firewall)**, donde Docker no puede
    interferir porque el paquete se filtra antes de llegar a la máquina. Regla SSH (22) abierta
    a todos (IP del operador variable; el candado del SSH es solo-clave, ver §5).
- **Endurecimiento:** modo **Full (Strict)**; plan futuro **Origin Certificate**.

### 2.7 PostgreSQL + PostGIS *(autohospedado)*
- **Código:** `pg` Pool + Drizzle; migraciones versionadas; extensión creada por
  `deploy/init-postgis.sql`; aislamiento multi-tenant en **dos capas**: (a) filtrado explícito
  por `tenant_id` en los repositorios + `SET LOCAL app.current_tenant_id` (guardas en CI), y
  (b) políticas RLS (`FORCE ROW LEVEL SECURITY`).
- **⚠️ Pendiente (RLS no efectivo en producción):** la app conecta a Postgres con el rol
  **superusuario** creado por la imagen, y los superusuarios **saltan el RLS** (incluso con
  `FORCE`). Es decir, la capa (a) sí aísla, pero la capa (b) —el RLS— **no se aplica en prod**
  (sí en los tests, que corren con un rol restringido). Cierre correcto: crear un rol de app
  sin `SUPERUSER`/`BYPASSRLS` y usarlo en `DATABASE_URL`; el login/setup-password ya usan
  `PublicContext` (`SET LOCAL`) para funcionar con RLS activo. Hasta entonces, el documento no
  debe afirmar que el RLS aísla los tenants en producción.
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
   target `tools`) con los 6 build-args públicos (`NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_SITE_URL`,
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_TENANT_ID`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_SENTRY_DSN`
   — ya añadidos a `cd.yml` y al `Makefile`); push a GHCR con tag por rama (`develop`/`latest`) + `sha`.
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
- Cloudflare **naranja** (ocultar origen); modo Full (Strict) pendiente de confirmar.
- **Firewall (hecho ✅):** Hetzner Cloud Firewall — 80/443 solo desde los 15 rangos de
  Cloudflare; 22 abierto (candado = solo-clave). Origen verificado como inalcanzable por IP
  directa. *(Se descartó `ufw` porque Docker lo bypasea; ver §2.6.)*
- **SSH (hecho ✅):** `PermitRootLogin no` + `PasswordAuthentication no` (solo clave), tras
  confirmar acceso por clave. Verificado desde fuera: una conexión forzada por contraseña recibe
  `Permission denied (publickey)`. *(Pendiente menor: `ssh_pwauth: false` en
  `/etc/cloud/cloud.cfg.d/` para que cloud-init no revierta esto en el próximo reboot.)*
- **Usuarios demo (hecho ✅):** de 6 usuarios, 4 tenían aún `Domio2026!` (contraseña que está en
  `scripts/seed.ts`, público). Desactivados (`is_active=false`, se conserva su historial de
  leads y consentimientos RGPD). El admin se rotó a una contraseña fuerte propia. Verificado con
  `bcrypt.compare` (la misma librería que valida los logins): ninguna cuenta activa usa la
  contraseña pública. *(Nota metodológica: `pgcrypto` daba un falso "todas seguras" porque no
  reconoce los hashes `$2b$` de bcryptjs; la comprobación válida es con la librería real.)*
- **Cabeceras** (ya): HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy; valorar **CSP**.
- **No indexación de dev (hecho ✅):** `dev.wedomio.com` emite `X-Robots-Tag: noindex` y su
  `robots.txt` bloquea todo, condicionado por `APP_ENV` (producción se indexa normal).
- **RGPD:** banner de consentimiento, ARSOP (derechos), scrubbing de PII en Sentry, backups cifrados.

---

## 6. Backups y recuperación ante desastres
- **Backup (hecho ✅):** `pg_dump -Fc` nocturno por cron (3:00 UTC) → `/opt/domio/backups/`,
  con retención de 14 días y log en `backups/backup.log` (`make -f deploy/Makefile backup`).
- **Restauración probada (hecho ✅):** `make -f deploy/Makefile restore-test` restaura el último
  dump sobre una BD temporal, verifica recuentos y cronometra. Resultado medido: **3 s de tiempo
  de recuperación**, datos íntegros (9 promociones, 6 usuarios, 10 leads).
- **Pendiente (opcional):** subir el dump a R2 (copia fuera del VPS, sobrevive a la pérdida de la
  máquina). Hoy el backup vive en el mismo servidor.
- **Rollback de esquema:** migraciones expand/contract (forward-only); rollback real = restaurar dump.
- **Evidencia TFM:** log del cron + salida de `restore-test` (recuentos + tiempo de recuperación).

---

## 7. Observabilidad
- **Errores:** Sentry (dashboards, releases, alertas).
- **Logs:** `docker compose logs` (rotación `json-file`).
- **Health:** `/api/health` (con `env`) + monitor de uptime externo (UptimeRobot).
- **KPIs técnicos:** tasa de error, p95, uptime %, backlog de `email_queue`, nº de 429.

---

## 8. Roadmap ordenado por dependencias

```
FASE 1 — Servicios externos                                          [HECHA ✅]
  1. R2       ✅ (fix build-arg R2_PUBLIC_URL aplicado)
  2. Resend   ✅ (fix to_email; email recibido)
  3. Sentry   ✅ (3 fixes; server+cliente reportando; /api/debug-error → 404 en prod)
  4. Upstash  ✅ (429 con API key; el bucle sin clave del plan original era inviable)
  5. Turnstile ✅ (fix stale closure + build-arg)
  6. Cloudflare ✅ (dig + cabeceras + origen oculto por firewall Hetzner)
FASE 3 — Cierre (adelantada)                                         [HECHA ✅]
  12. Hardening (SSH solo-clave, firewall, usuarios demo desactivados) ✅
  13. dev noindex ✅          14. Backups cron + restauración probada ✅
FASE 2 — Integración continua                                        [PENDIENTE]
  7. GitHub Environments (secrets + vars)                                  [crítico]
  8. VPS en main   9. Push develop → deploy dev   10. Merge main → deploy prod   11. Rollback
FASE 4 — Remates                                                     [PENDIENTE]
  R1. RLS: rol de app sin privilegios (hoy la app es superuser → RLS no aplica en prod)
  R2. cloud-init ssh_pwauth:false   R3. cdn.wedomio.com   R4. backups → R2
  15. Evidencias + diagramas + repaso final
```
**Nota:** la FASE 1 y el hardening (FASE 3) se completaron antes que el CI/CD. El CI/CD (FASE 2)
sigue pendiente; hasta activarlo, los despliegues son manuales vía `make deploy-{dev,prod}` y
requieren tener el VPS en la rama correcta (`develop` para dev, `main` para prod).

---

## 9. Checklist de entrega TFM
- [ ] Diagrama de arquitectura (§1, pulido).
- [ ] Tabla de servicios externos: rol · alternativa · justificación de la elección.
- [ ] Inventario de variables/secretos y su gestión (§3).
- [x] Servicios verificados con `check-services` (los 6 en ✅). Faltan las capturas: R2
      renderizada, email recibido, evento Sentry (env+release), 429 con API key, widget Turnstile.
- [ ] Captura de Actions (CI verde + CD deploy + rollback) — depende de activar el CI/CD.
- [ ] Estrategia Git y de migraciones.
- [x] Backups automatizados + **restauración probada (3 s)**. Falta capturar el log del cron.
- [x] Hardening: firewall (origen oculto), SSH solo-clave, usuarios demo desactivados, dev noindex.
      Faltan las capturas (timeout por IP directa, `Permission denied (publickey)`, login demo rechazado).
- [ ] Cabeceras, TLS, RGPD (banner/ARSOP) — pendiente de repaso.
- [ ] Anexos: `DESPLIEGUE.md`, `PLAN-MANANA.md`, `PLAN-PRUEBAS-TFM.md`, `deploy/README.md`.
