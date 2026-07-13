# Runbook — de 0 a wedomio.com en producción

> Guía paso a paso pensada para **no perderte**. Sigue las fases **en orden**.
> Cada fase tiene: 🎯 objetivo · ⛔ requisito previo · los pasos · 👀 qué deberías
> ver · 🔧 si falla · ✅ puerta de salida (no pases a la siguiente hasta cumplirla).
>
> Leyenda: 👤 = solo puedes hacerlo tú (compra/cuenta/panel web) · 💻 = comando.
> Datos fijos del proyecto: repo `darjav95dev-master/domio` · dominio `wedomio.com` /
> `dev.wedomio.com` · tenant público `00000000-0000-0000-0000-000000000001` ·
> imágenes `ghcr.io/darjav95dev-master/domio-{web,tools}`.

---

## Mapa de dependencias (qué bloquea a qué)

```
A (cuentas/compras) ─┬─► B (dominio + DNS) ──────────────┐
                     └─► C (VPS) ─► D (secretos server) ─► E (imágenes) ─► F (deploy+datos) ─► H (go-live)
G (GitHub CD) ── en paralelo, habilita deploy automático ─────────────────────────────────┘
```

- **Ruta crítica:** A → C → D → E → F → H. B puede ir en paralelo a C/D pero **debe estar lista antes de H** (si no, no hay HTTPS ni dominio).
- **Mínimo para ver algo publicado:** A1–A3 → B → C → D → E(manual) → F → H.
- Tiempo total realista la primera vez: **medio día**, la mayor parte esperando propagación de DNS y rellenando paneles.

---

## Fase A — Cuentas y compras 👤

🎯 Tener todas las cuentas y el dominio comprado.
⛔ Requisito previo: ninguno.

| # | Qué | Dónde | Coste | Notas |
|---|-----|-------|-------|-------|
| A1 | Registrar **wedomio.com** | Cloudflare Registrar o Namecheap | ~10 €/año | Si lo compras en Cloudflare, la Fase B2 se salta (ya está dentro) |
| A2 | Cuenta **Cloudflare** Free | cloudflare.com | 0 € | Aquí viven DNS, R2 y Turnstile |
| A3 | **VPS Hetzner Cloud CX22** | console.hetzner.cloud | ~4,5 €/mes | Ubuntu 24.04, 2 vCPU / 4 GB. Apúntate la **IP pública** |
| A4 | **Resend** | resend.com | 0 € (3k/mes) | Email transaccional |
| A5 | **Sentry** | sentry.io | 0 € | Crea un proyecto "Next.js" llamado `domio` |
| A6 | **Upstash** | upstash.com | 0 € | Crea una base **Redis** (rate limiting) |
| A7 | **Turnstile** | Cloudflare → Turnstile | 0 € | Anti-bot de formularios |

✅ **Puerta:** tienes acceso a los 7 paneles y la **IP del VPS** anotada.

---

## Fase B — Dominio + DNS + servicios de Cloudflare 👤

🎯 Que `wedomio.com` y `dev.wedomio.com` apunten a tu VPS y el TLS esté en modo correcto.
⛔ Requisito previo: A1, A2, A3 (necesitas la IP del VPS).

**B1.** Cloudflare → *Add a site* → `wedomio.com`, plan **Free**.
**B2.** (Solo si compraste el dominio fuera de Cloudflare) En tu registrador, cambia los *nameservers* por los dos que te muestra Cloudflare. → Propagación: minutos a 24 h.
**B3.** Cloudflare → **DNS → Records**, con `IP_VPS` = IP de A3:

| Tipo | Nombre | Contenido | Proxy status |
|------|--------|-----------|--------------|
| A | `@` (wedomio.com) | `IP_VPS` | 🟠 Proxied |
| A | `dev` | `IP_VPS` | 🟠 Proxied |

**B4.** Cloudflare → **SSL/TLS → Overview → Full (Strict)**.
**B5.** **R2** (Cloudflare → R2): crea buckets `domio-prod` y `domio-dev`. En cada uno → *Settings → Public access* → conecta dominio `cdn.wedomio.com` (prod) y `cdn-dev.wedomio.com` (dev); Cloudflare te creará esos CNAME solo.
**B6.** **Turnstile** (Cloudflare → Turnstile → *Add site*): dominio `wedomio.com` → te da **Site Key** (pública) y **Secret Key**. Guárdalas para Fase D/G.

👀 Qué deberías ver: en Cloudflare, el dominio en estado **Active** (no "Pending nameservers").
🔧 Si sigue "Pending": los nameservers del registrador aún no propagaron; espera y recarga.

✅ **Puerta:** dominio **Active** en Cloudflare + los dos registros `A` creados + SSL en Full (Strict).

---

## Fase C — Provisionar el VPS 💻

🎯 Un servidor con Docker, firewall y el repo clonado.
⛔ Requisito previo: A3 (VPS creado, con acceso SSH).

**C1. Genera una clave SSH dedicada al deploy** (en TU máquina, no en el VPS):
```bash
ssh-keygen -t ed25519 -f ~/.ssh/domio_deploy -C "domio-deploy" -N ""
# Crea dos ficheros: ~/.ssh/domio_deploy (privada) y ~/.ssh/domio_deploy.pub (pública)
```
> La **privada** irá a GitHub (Fase G, `SSH_KEY`). La **pública** va al VPS (C3).

**C2. Entra al VPS como root** (con la contraseña/clave que te dio Hetzner):
```bash
ssh root@IP_VPS
```

**C3. Crea el usuario `deploy`, firewall y Docker** (pega todo el bloque):
```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
# Pega aquí el contenido de ~/.ssh/domio_deploy.pub de tu máquina:
echo "ssh-ed25519 AAAA...tu-clave-publica... domio-deploy" > /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

**C4. Clona el repo** (como `deploy`):
```bash
mkdir -p /opt/domio && chown deploy:deploy /opt/domio
su - deploy
git clone https://github.com/darjav95dev-master/domio.git /opt/domio
cd /opt/domio && git checkout main
```

👀 Qué deberías ver: `docker --version` responde, y `ls /opt/domio` muestra el repo.
🔧 Si `git clone` pide credenciales: el repo es privado → usa un token
(`https://TOKEN@github.com/...`) o configura una deploy key.

✅ **Puerta:** desde tu máquina, `ssh -i ~/.ssh/domio_deploy deploy@IP_VPS` entra sin contraseña, y `docker ps` funciona sin `sudo`.

---

## Fase D — Secretos en el servidor 💻 (nunca en el repo)

🎯 Crear los ficheros de entorno **en el VPS**, con contraseñas generadas ahí.
⛔ Requisito previo: C (repo en el VPS) y tener a mano las claves de terceros (ver tabla "De dónde sacar cada RELLENAR" más abajo).

Ejecuta en el VPS, dentro de `/opt/domio`, el **bloque de "Puesta en marcha" de
[`deploy/README.md`](../deploy/README.md)**. Ese bloque:
1. Genera `PROD_PG`/`DEV_PG` y `AUTH_SECRET` con `openssl` (in situ).
2. Crea `deploy/env.proxy`, `deploy/env.prod`, `deploy/env.dev`, `.env.production`, `.env.development`.
3. Aplica `chmod 600`.

Luego **edita `.env.production` y `.env.development`** y sustituye cada `RELLENAR`:

### De dónde sacar cada `RELLENAR`

| Variable | Dónde obtenerla (ruta exacta) |
|----------|-------------------------------|
| `R2_ACCOUNT_ID` | Cloudflare → R2 → *(arriba a la derecha)* "Account ID" |
| `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` | Cloudflare → R2 → **Manage R2 API Tokens** → *Create API token* (permiso **Object Read & Write**) → copia ambos (el secret solo se muestra una vez) |
| `R2_BUCKET` | El nombre que creaste: `domio-prod` (prod) / `domio-dev` (dev) — ya viene puesto |
| `R2_PUBLIC_URL` | El dominio público del bucket: `https://cdn.wedomio.com` — ya viene puesto |
| `RESEND_API_KEY` | resend.com → **API Keys** → *Create API Key*. Además: **Domains → Add domain `wedomio.com`** y añade los registros DNS que te dé (SPF/DKIM) en Cloudflare, o los emails no se entregan |
| `SENTRY_DSN` | sentry.io → tu proyecto `domio` → **Settings → Client Keys (DSN)** → copia el DSN |
| `RATE_LIMIT_STORE_URL` + `RATE_LIMIT_STORE_TOKEN` | Upstash → tu base Redis → pestaña **REST API** → `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (el cliente usa HTTP REST, por eso es la URL REST, no la de conexión TCP) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile → tu site → **Site Key** (es pública) |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → tu site → **Secret Key** |

> ⚠️ `RATE_LIMIT_STORE_URL` es **obligatoria en producción**: si falta, la app
> **no arranca** (guarda fail-fast) para evitar dejar el rate limiting desactivado.

👀 Qué deberías ver: `ls -la /opt/domio/.env.production` con permisos `-rw-------` (600) y sin ningún `RELLENAR` dentro (`grep RELLENAR .env.*` no devuelve nada).
🔧 Si `grep RELLENAR .env.production` devuelve líneas → aún faltan claves por pegar.

✅ **Puerta:** `grep -c RELLENAR .env.production .env.development` devuelve `0` en ambos.

---

## Fase E — Construir y publicar las imágenes 💻

🎯 Tener `domio-web` y `domio-tools` en GHCR.
⛔ Requisito previo: D (para build de prod necesitas los `NEXT_PUBLIC_*`).

Dos vías (elige una):

### E-opción 1 — Automática (recomendada, tras Fase G)
Haz push a `main`. El workflow [`cd.yml`](../.github/workflows/cd.yml) construye ambas imágenes, las sube a GHCR y despliega por SSH. **No necesitas construir a mano.** (Necesita los secrets de Fase G.)

### E-opción 2 — Manual la primera vez
Desde el **VPS** (o tu Mac con Docker con ≥6 GB de RAM asignada; con menos, el build muere con *exit 137 = OOM*):
```bash
cd /opt/domio
# Login en GHCR con un PAT (ver "Token de GHCR" abajo)
echo "$GHCR_TOKEN" | docker login ghcr.io -u darjav95dev-master --password-stdin

docker build --target runner \
  --build-arg NEXT_PUBLIC_APP_ENV=production \
  --build-arg NEXT_PUBLIC_SITE_URL=https://wedomio.com \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=<tu-site-key> \
  -t ghcr.io/darjav95dev-master/domio-web:latest .
docker build --target tools -t ghcr.io/darjav95dev-master/domio-tools:latest .

docker push ghcr.io/darjav95dev-master/domio-web:latest
docker push ghcr.io/darjav95dev-master/domio-tools:latest
```

### Token de GHCR (PAT)
GitHub → *Settings → Developer settings → Personal access tokens → Tokens (classic)*
→ *Generate new token* con scope **`write:packages`** (incluye `read:packages`).
Ese valor es `GHCR_TOKEN` para el `docker login` del VPS.

👀 Qué deberías ver: en GitHub → tu perfil → **Packages**, aparecen `domio-web` y `domio-tools`.
🔧 `denied: permission`: el PAT no tiene `write:packages`, o el `docker login` falló.

✅ **Puerta:** los dos paquetes existen en GHCR y desde el VPS `docker pull ghcr.io/darjav95dev-master/domio-web:latest` funciona.

---

## Fase F — Primer arranque + carga de datos 💻 (en el VPS)

🎯 Los tres stacks corriendo y tus datos reales dentro.
⛔ Requisito previo: D (secretos) + E (imágenes en GHCR) + B (DNS, para que Caddy emita el certificado).

**F1. Sube el backup de datos** desde tu máquina al VPS:
```bash
scp -i ~/.ssh/domio_deploy backups/domio_appdata_20260713.dump deploy@IP_VPS:/opt/domio/backups/
```

**F2. Levanta todo** (en el VPS):
```bash
cd /opt/domio
echo "$GHCR_TOKEN" | docker login ghcr.io -u darjav95dev-master --password-stdin
make -f deploy/Makefile proxy-up   # Caddy: pedirá el certificado TLS a Let's Encrypt
make -f deploy/Makefile prod-up
make -f deploy/Makefile dev-up
```

**F3. Carga los datos** (esquema por migraciones + datos de app):
```bash
deploy/scripts/migrate-data.sh domio-prod backups/domio_appdata_20260713.dump
deploy/scripts/migrate-data.sh domio-dev  backups/domio_appdata_20260713.dump
```

👀 Qué deberías ver: el script imprime al final el recuento (`promociones 9`, `unidades 77`, `users 35`, `leads 22`).
🔧 Si `migrate-data.sh` falla en migraciones: revisa que PostGIS se creó (`docker compose -p domio-prod -f deploy/docker-compose.app.yml exec postgres psql -U domio -d domio -c "\dx"` debe listar `postgis`).
🔧 Si Caddy no saca certificado: DNS aún no apunta al VPS (Fase B) o el puerto 443 está cerrado (Fase C firewall).

✅ **Puerta:** `docker ps` muestra `domio-prod-web`, `domio-prod-worker`, `domio-prod-postgres`, sus equivalentes `dev` y `domio-proxy-caddy`, todos `healthy`/`Up`.

---

## Fase G — GitHub para el CD automático 👤 (en paralelo con C–F)

🎯 Que `develop`→dev y `main`→prod desplieguen solos.
⛔ Requisito previo: C1 (clave SSH) y C3 (usuario deploy) para los valores.

GitHub → repo `domio` → **Settings → Environments** → crea **`production`** y **`development`**. En cada uno añade lo siguiente.

### 🔑 Secrets y Variables por environment (copia exacta)

**Environment `production`:**

| Tipo | Nombre | Valor |
|------|--------|-------|
| Secret | `SSH_HOST` | `IP_VPS` |
| Secret | `SSH_USER` | `deploy` |
| Secret | `SSH_KEY` | *(contenido completo de `~/.ssh/domio_deploy`, la clave privada, con `-----BEGIN...` y `-----END...`)* |
| Secret | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *(Site Key de Turnstile)* |
| Variable | `NEXT_PUBLIC_APP_ENV` | `production` |
| Variable | `NEXT_PUBLIC_SITE_URL` | `https://wedomio.com` |

**Environment `development`:**

| Tipo | Nombre | Valor |
|------|--------|-------|
| Secret | `SSH_HOST` | `IP_VPS` *(el mismo VPS)* |
| Secret | `SSH_USER` | `deploy` |
| Secret | `SSH_KEY` | *(la misma clave privada `~/.ssh/domio_deploy`)* |
| Secret | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *(Site Key de Turnstile — puede ser la misma)* |
| Variable | `NEXT_PUBLIC_APP_ENV` | `development` |
| Variable | `NEXT_PUBLIC_SITE_URL` | `https://dev.wedomio.com` |

> **No hace falta crear `GITHUB_TOKEN`**: GitHub lo inyecta solo (el workflow ya
> pide permiso `packages: write`). Las claves de R2/Resend/Sentry/Upstash **no van
> en GitHub**: solo las usa la app en runtime, y viven en los `.env.*` del VPS (Fase D).
>
> Nota: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` es técnicamente pública (se incrusta en el
> cliente); se guarda como *secret* solo por comodidad, no por confidencialidad.

👀 Qué deberías ver: en *Actions*, al hacer push a `main`, el workflow **CD** corre `build-and-push` → `deploy` en verde.
🔧 Si `deploy` falla en SSH: revisa `SSH_KEY` (privada completa), `SSH_HOST` (IP) y que la pública esté en `authorized_keys` del VPS (C3).

✅ **Puerta:** un push a `main` despliega prod sin que toques el VPS a mano.

---

## Fase H — Go-live y verificación 💻

🎯 Confirmar que la web pública responde y funciona.
⛔ Requisito previo: F (stacks arriba) + B (DNS/SSL activos).

**H1. Health checks:**
```bash
curl -s https://wedomio.com/api/health       # → {"status":"ok","env":"production"}
curl -s https://dev.wedomio.com/api/health    # → {"status":"ok","env":"development"}
```

**H2. Smoke tests manuales** (en el navegador):
- [ ] `https://wedomio.com` — home carga.
- [ ] Catálogo lista las 9 promociones con imágenes (servidas desde `cdn.wedomio.com`).
- [ ] Detalle de un inmueble abre y muestra el mapa.
- [ ] Formulario de contacto → se crea el lead → llega el email (worker + Resend).
- [ ] `/panel/login` — entra con un usuario admin; edita una promoción; sube una imagen (va a R2).
- [ ] API pública: `curl https://wedomio.com/api/v1/promociones` con una API key responde; al exceder el límite devuelve `429` (confirma que Upstash está activo).
- [ ] `https://wedomio.com/sitemap.xml` y `/robots.txt` correctos.

**H3. Backup automático** (cron en el VPS, como `deploy`):
```bash
crontab -e
# añade:
0 3 * * * cd /opt/domio && make -f deploy/Makefile backup >> /opt/domio/backups/cron.log 2>&1
```

✅ **Puerta final:** los dos health checks devuelven el `env` correcto y los smoke tests pasan. **Ya está publicado.**

---

## Rollback rápido (si un deploy sale mal)

```bash
cd /opt/domio
# Fija el tag de imagen al anterior (o a un sha concreto) en deploy/env.prod:
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<sha-anterior>/' deploy/env.prod
make -f deploy/Makefile prod-up
```
Si la migración fue destructiva (contract), restaura el `pg_dump` previo de `backups/`.

## Resumen de costes

| Concepto | Coste |
|----------|-------|
| Dominio wedomio.com | ~10 €/año |
| VPS Hetzner CX22 | ~4,5 €/mes |
| Cloudflare / R2 / Resend / Sentry / Upstash / Turnstile | 0 € (free tier) |
| **Total** | **~5 €/mes + 10 €/año** |
