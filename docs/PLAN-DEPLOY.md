# Plan de despliegue — de 0 a wedomio.com en producción

> Plan exhaustivo basado en `docs/RUNBOOK-PRODUCCION.md`.
> Sigue cada paso en orden. Marca ✅ al completar. No pases a la siguiente fase
> sin cumplir la puerta de salida.
>
> Leyenda: 👤 = tarea tuya (compras/cuentas/paneles) · 💻 = comando en tu máquina o VPS
>
> **Estado actual del repo:**
> - Rama: `feat/integration-enviroment` (cambios del deploy staged, listos para commit)
> - `main` y `develop` existen local y en remoto
> - Backup disponible: `backups/domio_appdata_20260713.dump`
> - Dockerfile, Caddyfile, Makefile, docker-compose, CD workflow, migrate-data.sh — todos en el repo
> - `.env.example` existe como plantilla; los `.env.*` reales están gitignored

---

## 📋 Checklist global (réplica rápida)

```
Fase A — Cuentas y compras         □  (7 paneles + IP del VPS)
Fase B — Dominio + DNS + Cloudflare □  (Active + 2 registros A + Full Strict)
Fase C — Provisionar VPS            □  (SSH sin password + Docker + repo)
Fase D — Secretos en el servidor    □  (0 RELLENAR)
Fase E — Imágenes en GHCR           □  (2 paquetes visibles)
Fase F — Primer arranque + datos    □  (6 contenedores healthy)
Fase G — GitHub CD automático       □  (push a main → deploy verde)
Fase H — Go-live y verificación      □  (health checks + smoke tests)
```

**Ruta crítica:** A → C → D → E → F → H. B y G van en paralelo.
Tiempo estimado primera vez: medio día (la mayor parte esperando DNS).

---

## Fase A — Cuentas y compras 👤

🎯 Tener todas las cuentas y el dominio comprado.
⛔ Requisito: ninguno.

| #  | Qué                           | Dónde                              | Coste          | Estado |
|----|-------------------------------|-------------------------------------|----------------|--------|
| A1 | Registrar **wedomio.com**       | Cloudflare Registrar o Namecheap    | ~10 €/año      | □      |
| A2 | Cuenta **Cloudflare** Free    | cloudflare.com                      | 0 €            | □      |
| A3 | **VPS Hetzner CX22**           | console.hetzner.cloud (Ubuntu 24.04)| ~4,5 €/mes     | □      |
| A4 | **Resend** (email transaccional)| resend.com                       | 0 € (3k/mes)   | □      |
| A5 | **Sentry** proyecto "Next.js" `domio` | sentry.io                  | 0 €            | □      |
| A6 | **Upstash** base Redis         | upstash.com                        | 0 €            | □      |
| A7 | **Turnstile**                  | Cloudflare → Turnstile             | 0 €            | □      |

### 📌 Apunta aquí tus valores (no los subas al repo):

```
IP_VPS = ______________________________________________
SENTRY_DSN = ______________________________________________
UPSTASH_REDIS_REST_URL = ______________________________________________
UPSTASH_REDIS_REST_TOKEN = ______________________________________________
RESEND_API_KEY = ______________________________________________
TURNSTILE_SITE_KEY = ______________________________________________
TURNSTILE_SECRET_KEY = ______________________________________________
R2_ACCOUNT_ID = ______________________________________________
R2_ACCESS_KEY_ID = ______________________________________________
R2_SECRET_ACCESS_KEY = ______________________________________________  (solo se muestra una vez!)
```

✅ **Puerta:** tienes acceso a los 7 paneles y la IP del VPS anotada.

---

## Fase B — Dominio + DNS + Cloudflare 👤

🎯 Que `wedomio.com` y `dev.wedomio.com` apunten al VPS y TLS en modo correcto.
⛔ Requisito: A1, A2, A3 (necesitas la IP del VPS).

### B1. Añadir el dominio a Cloudflare
- Cloudflare → *Add a site* → `wedomio.com` → plan **Free**
- ☐ Hecho

### B2. Cambiar nameservers (solo si compraste el dominio FUERA de Cloudflare)
- En tu registrador, cambia los *nameservers* por los 2 que te muestra Cloudflare
- Propagación: minutos a 24 h
- ☐ Hecho

### B3. Registros DNS en Cloudflare
Cloudflare → **DNS → Records**, con `IP_VPS` = IP de A3:

| Tipo | Nombre       | Contenido   | Proxy status   | ☐ |
|------|-------------|-------------|----------------|---|
| A    | `@` (wedomio.com) | `IP_VPS` | 🟠 Proxied    | ☐ |
| A    | `dev`       | `IP_VPS`    | 🟠 Proxied    | ☐ |

> Nota: los CNAME de `cdn.wedomio.com` y `cdn-dev.wedomio.com` los crea R2
> automáticamente en B5.

### B4. SSL/TLS
- Cloudflare → **SSL/TLS → Overview → Full (Strict)**
- ☐ Hecho

### B5. R2
- Cloudflare → **R2** → crea buckets:
  - `domio-prod` → *Settings → Public access* → conecta dominio `cdn.wedomio.com`
  - `domio-dev` → *Settings → Public access* → conecta dominio `cdn-dev.wedomio.com`
- ☐ Hecho — anota `R2_ACCOUNT_ID`, crea API Token (Object Read & Write) → anota `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY`

### B6. Turnstile
- Cloudflare → **Turnstile → Add site** → dominio `wedomio.com`
- ☐ Hecho — anota **Site Key** (pública) y **Secret Key**

👀 **Deberías ver:** dominio en estado **Active** (no "Pending nameservers").
🔧 **Si sigue Pending:** los nameservers del registrador aún no propagaron; espera y recarga.

✅ **Puerta:** dominio **Active** + los 2 registros `A` + SSL en Full (Strict).

---

## Fase C — Provisionar el VPS 💻

🎯 Servidor con Docker, firewall y el repo clonado.
⛔ Requisito: A3 (VPS con acceso SSH).

### C1. Clave SSH dedicada al deploy (en TU máquina)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/domio_deploy -C "domio-deploy" -N ""
# Crea: ~/.ssh/domio_deploy (privada) y ~/.ssh/domio_deploy.pub (pública)
```
- ☐ Hecho
- 📌 La **privada** va a GitHub (Fase G, `SSH_KEY`). La **pública** va al VPS (C3).

### C2. Entrar al VPS como root
```bash
ssh root@IP_VPS
```
- ☐ Hecho

### C3. Crear usuario deploy, firewall y Docker
Pega todo el bloque (sustituye tu clave pública):
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
- ☐ Hecho

### C4. Clonar el repo (como deploy)
```bash
mkdir -p /opt/domio && chown deploy:deploy /opt/domio
su - deploy
git clone https://github.com/darjav95dev-master/domio.git /opt/domio
cd /opt/domio && git checkout main
```
- ☐ Hecho
> 🔧 Si `git clone` pide credenciales (repo privado): usa un PAT
> (`https://TOKEN@github.com/...`) o configura una deploy key.

👀 **Deberías ver:** `docker --version` responde, `ls /opt/domio` muestra el repo.

✅ **Puerta:** desde tu máquina:
```bash
ssh -i ~/.ssh/domio_deploy deploy@IP_VPS
```
entra sin contraseña, y `docker ps` funciona sin `sudo`.

---

## Fase D — Secretos en el servidor 💻

🎯 Crear los ficheros de entorno **en el VPS**, con contraseñas generadas ahí.
⛔ Requisito: C (repo en VPS) + tener a mano las claves de terceros (Fase A/B).

### D1. Ejecutar el bloque de "Puesta en marcha" del deploy/README.md
En el VPS, dentro de `/opt/domio`:
```bash
cd /opt/domio

# ── Contraseñas de Postgres: generadas in situ ──
PROD_PG=$(openssl rand -base64 24 | tr -dc A-Za-z0-9 | head -c 24)
DEV_PG=$(openssl rand -base64 24 | tr -dc A-Za-z0-9 | head -c 24)

# ── deploy/env.proxy — dominios ──
cat > deploy/env.proxy <<'EOF'
PROD_DOMAIN=wedomio.com
DEV_DOMAIN=dev.wedomio.com
EOF

# ── deploy/env.prod ──
cat > deploy/env.prod <<EOF
IMAGE_WEB=ghcr.io/darjav95dev-master/domio-web
IMAGE_TOOLS=ghcr.io/darjav95dev-master/domio-tools
IMAGE_TAG=latest
POSTGRES_USER=domio
POSTGRES_PASSWORD=$PROD_PG
POSTGRES_DB=domio
APP_ENV_FILE=../.env.production
WEB_ALIAS=domio-prod-web
EOF

# ── deploy/env.dev ──
cat > deploy/env.dev <<EOF
IMAGE_WEB=ghcr.io/darjav95dev-master/domio-web
IMAGE_TOOLS=ghcr.io/darjav95dev-master/domio-tools
IMAGE_TAG=develop
POSTGRES_USER=domio
POSTGRES_PASSWORD=$DEV_PG
POSTGRES_DB=domio
APP_ENV_FILE=../.env.development
WEB_ALIAS=domio-dev-web
EOF

# ── .env.production ──
cat > .env.production <<EOF
APP_ENV=production
NEXT_PUBLIC_APP_ENV=production
DATABASE_URL=postgresql://domio:$PROD_PG@postgres:5432/domio
PUBLIC_TENANT_ID=00000000-0000-0000-0000-000000000001
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_URL=https://wedomio.com
R2_ACCOUNT_ID=RELLENAR
R2_ACCESS_KEY_ID=RELLENAR
R2_SECRET_ACCESS_KEY=RELLENAR
R2_BUCKET=domio-prod
R2_PUBLIC_URL=https://cdn.wedomio.com
RESEND_API_KEY=RELLENAR
SENTRY_DSN=RELLENAR
RATE_LIMIT_STORE_URL=RELLENAR
RATE_LIMIT_STORE_TOKEN=RELLENAR
NEXT_PUBLIC_TURNSTILE_SITE_KEY=RELLENAR
TURNSTILE_SECRET_KEY=RELLENAR
NEXT_PUBLIC_SITE_URL=https://wedomio.com
EOF

# ── .env.development ──
cat > .env.development <<EOF
APP_ENV=development
NEXT_PUBLIC_APP_ENV=development
DATABASE_URL=postgresql://domio:$DEV_PG@postgres:5432/domio
PUBLIC_TENANT_ID=00000000-0000-0000-0000-000000000001
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_URL=https://dev.wedomio.com
R2_ACCOUNT_ID=RELLENAR
R2_ACCESS_KEY_ID=RELLENAR
R2_SECRET_ACCESS_KEY=RELLENAR
R2_BUCKET=domio-dev
R2_PUBLIC_URL=https://cdn-dev.wedomio.com
RESEND_API_KEY=RELLENAR
SENTRY_DSN=RELLENAR
RATE_LIMIT_STORE_URL=RELLENAR
RATE_LIMIT_STORE_TOKEN=RELLENAR
NEXT_PUBLIC_TURNSTILE_SITE_KEY=RELLENAR
TURNSTILE_SECRET_KEY=RELLENAR
NEXT_PUBLIC_SITE_URL=https://dev.wedomio.com
EOF

chmod 600 .env.production .env.development deploy/env.*
```
- ☐ Hecho

### D2. Rellenar los RELLENAR con claves reales
Edita los dos archivos:
```bash
nano .env.production .env.development
```

Sustituye cada `RELLENAR` usando esta tabla:

| Variable                         | Dónde obtenerla                                                          |
|----------------------------------|--------------------------------------------------------------------------|
| `R2_ACCOUNT_ID`                  | Cloudflare → R2 → (arriba derecha) "Account ID"                          |
| `R2_ACCESS_KEY_ID`               | Cloudflare → R2 → **Manage R2 API Tokens** → Create API token (Object Read & Write) → copia Access Key ID |
| `R2_SECRET_ACCESS_KEY`           | Mismo token anterior → copia Secret Access Key (solo se muestra una vez)  |
| `R2_BUCKET`                      | Ya viene puesto: `domio-prod` (prod) / `domio-dev` (dev)               |
| `R2_PUBLIC_URL`                  | Ya viene puesto: `https://cdn.wedomio.com` (prod) / `https://cdn-dev.wedomio.com` (dev) |
| `RESEND_API_KEY`                 | resend.com → API Keys → Create API Key. Además: **Domains → Add domain `wedomio.com`** → añade los registros DNS (SPF/DKIM) en Cloudflare |
| `SENTRY_DSN`                     | sentry.io → proyecto `domio` → Settings → Client Keys (DSN) → copia DSN  |
| `RATE_LIMIT_STORE_URL`           | Upstash → tu base Redis → pestaña **REST API** → `UPSTASH_REDIS_REST_URL` |
| `RATE_LIMIT_STORE_TOKEN`         | Upstash → misma pestaña REST API → `UPSTASH_REDIS_REST_TOKEN`           |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile → tu site → **Site Key** (pública)               |
| `TURNSTILE_SECRET_KEY`           | Cloudflare → Turnstile → tu site → **Secret Key**                       |

- ☐ `.env.production` — sin RELLENAR
- ☐ `.env.development` — sin RELLENAR
- ☐ Resend: dominio `wedomio.com` verificado (SPF/DKIM en Cloudflare DNS)

> ⚠️ `RATE_LIMIT_STORE_URL` es **obligatoria en producción**: si falta, la app
> **no arranca** (fail-fast en `instrumentation.ts`).

### D3. Verificar
```bash
grep -c RELLENAR .env.production .env.development    # debe devolver 0 en ambos
ls -la /opt/domio/.env.production                    # permisos -rw------- (600)
```
- ☐ Verificado

👀 **Deberías ver:** `grep -c RELLENAR` devuelve `0` en ambos archivos.
🔧 **Si devuelve líneas:** aún faltan claves por pegar.

✅ **Puerta:** `grep -c RELLENAR .env.production .env.development` → `0` en ambos.

---

## Fase E — Construir y publicar las imágenes 💻

🎯 Tener `domio-web` y `domio-tools` en GHCR.
⛔ Requisito: D (para build de prod necesitas los `NEXT_PUBLIC_*`).

### E1. Crear PAT de GitHub para GHCR
GitHub → *Settings → Developer settings → Personal access tokens → Tokens (classic)*
→ *Generate new token* con scope **`write:packages`** (incluye `read:packages`).
- ☐ Hecho — anota el token como `GHCR_TOKEN`

### E2. Elegir vía (recomendada: automática tras Fase G)

#### E-opción 1 — Automática (recomendada)
Haz push a `main`. El workflow `cd.yml` construye ambas imágenes, las sube a GHCR
y despliega por SSH. **No necesitas construir a mano.** (Necesita los secrets de Fase G.)
- ☐ Usaré esta vía

#### E-opcción 2 — Manual la primera vez
Desde el **VPS** (o tu Mac con Docker con ≥6 GB de RAM asignada):
```bash
cd /opt/domio
echo "$GHCR_TOKEN" | docker login ghcr.io -u darjav95dev-master --password-stdin

docker build --target runner \
  --build-arg NEXT_PUBLIC_APP_ENV=production \
  --build-arg NEXT_PUBLIC_SITE_URL=https://wedomio.com \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=<tu-site-key> \
  -t ghcr.io/darjav95dev-master/domio-web:latest .

docker build --target tools \
  -t ghcr.io/darjav95dev-master/domio-tools:latest .

docker push ghcr.io/darjav95dev-master/domio-web:latest
docker push ghcr.io/darjav95dev-master/domio-tools:latest
```
- ☐ Hecho (opción manual)

> 🔧 `denied: permission`: el PAT no tiene `write:packages`, o el `docker login` falló.

👀 **Deberías ver:** en GitHub → tu perfil → **Packages**, aparecen `domio-web` y `domio-tools`.

✅ **Puerta:** los 2 paquetes existen en GHCR y desde el VPS:
```bash
docker pull ghcr.io/darjav95dev-master/domio-web:latest
```
funciona.

---

## Fase F — Primer arranque + carga de datos 💻 (en el VPS)

🎯 Los tres stacks corriendo y tus datos reales dentro.
⛔ Requisito: D (secretos) + E (imágenes) + B (DNS, para que Caddy emita el certificado).

### F1. Subir el backup de datos (desde tu máquina)
```bash
scp -i ~/.ssh/domio_deploy \
  backups/domio_appdata_20260713.dump \
  deploy@IP_VPS:/opt/domio/backups/
```
- ☐ Hecho

### F2. Levantar todo (en el VPS)
```bash
cd /opt/domio
echo "$GHCR_TOKEN" | docker login ghcr.io -u darjav95dev-master --password-stdin
make -f deploy/Makefile proxy-up   # Caddy: pedirá el certificado TLS a Let's Encrypt
make -f deploy/Makefile prod-up
make -f deploy/Makefile dev-up
```
- ☐ proxy-up (Caddy)
- ☐ prod-up
- ☐ dev-up

> 🔧 Si Caddy no saca certificado: DNS aún no apunta al VPS (Fase B) o el puerto 443 está cerrado (Fase C firewall).

### F3. Cargar los datos (esquema por migraciones + datos de app)
```bash
deploy/scripts/migrate-data.sh domio-prod backups/domio_appdata_20260713.dump
deploy/scripts/migrate-data.sh domio-dev  backups/domio_appdata_20260713.dump
```
- ☐ domio-prod — datos cargados
- ☐ domio-dev — datos cargados

> 🔧 Si `migrate-data.sh` falla en migraciones: revisa que PostGIS se creó:
> ```bash
> docker compose -p domio-prod -f deploy/docker-compose.app.yml exec postgres \
>   psql -U domio -d domio -c "\dx"
> ```
> debe listar `postgis`.

👀 **Deberías ver:** el script imprime al final el recuento
(`promociones 9`, `unidades 77`, `users 35`, `leads 22`).

### F4. Verificar contenedores
```bash
docker ps
```
Debes ver 6 contenedores todos `healthy`/`Up`:
- `domio-prod-web`, `domio-prod-worker`, `domio-prod-postgres`
- `domio-dev-web`, `domio-dev-worker`, `domio-dev-postgres`
- `domio-proxy-caddy`

- ☐ Verificado

✅ **Puerta:** `docker ps` muestra los 6 contenedores + Caddy, todos healthy/Up.

---

## Fase G — GitHub CD automático 👤 (en paralelo con C–F)

🎯 Que `develop`→dev y `main`→prod desplieguen solos.
⛔ Requisito: C1 (clave SSH) y C3 (usuario deploy).

GitHub → repo `domio` → **Settings → Environments** → crea **`production`** y **`development`**.

### G1. Environment `production`

| Tipo     | Nombre                          | Valor                                              | ☐ |
|----------|---------------------------------|----------------------------------------------------|---|
| Secret   | `SSH_HOST`                      | `IP_VPS`                                           | ☐ |
| Secret   | `SSH_USER`                      | `deploy`                                           | ☐ |
| Secret   | `SSH_KEY`                       | *(contenido completo de `~/.ssh/domio_deploy`)*   | ☐ |
| Secret   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`| *(Site Key de Turnstile)*                          | ☐ |
| Variable | `NEXT_PUBLIC_APP_ENV`           | `production`                                       | ☐ |
| Variable | `NEXT_PUBLIC_SITE_URL`          | `https://wedomio.com`                                | ☐ |

### G2. Environment `development`

| Tipo     | Nombre                          | Valor                                              | ☐ |
|----------|---------------------------------|----------------------------------------------------|---|
| Secret   | `SSH_HOST`                      | `IP_VPS` *(el mismo VPS)*                          | ☐ |
| Secret   | `SSH_USER`                      | `deploy`                                           | ☐ |
| Secret   | `SSH_KEY`                       | *(la misma clave privada `~/.ssh/domio_deploy`)*  | ☐ |
| Secret   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`| *(Site Key de Turnstile — puede ser la misma)*      | ☐ |
| Variable | `NEXT_PUBLIC_APP_ENV`           | `development`                                      | ☐ |
| Variable | `NEXT_PUBLIC_SITE_URL`          | `https://dev.wedomio.com`                            | ☐ |

> **No hace falta crear `GITHUB_TOKEN`**: GitHub lo inyecta solo.
> Las claves de R2/Resend/Sentry/Upstash **no van en GitHub**: solo viven en
> los `.env.*` del VPS (Fase D).

👀 **Deberías ver:** en *Actions*, al hacer push a `main`, el workflow **CD** corre `build-and-push` → `deploy` en verde.

✅ **Puerta:** un push a `main` despliega prod sin que toques el VPS a mano.

---

## Fase H — Go-live y verificación 💻

🎯 Confirmar que la web pública responde y funciona.
⛔ Requisito: F (stacks arriba) + B (DNS/SSL activos).

### H1. Health checks
```bash
curl -s https://wedomio.com/api/health       # → {"status":"ok","env":"production"}
curl -s https://dev.wedomio.com/api/health    # → {"status":"ok","env":"development"}
```
- ☐ Prod health OK
- ☐ Dev health OK

### H2. Smoke tests manuales (en el navegador)
- ☐ `https://wedomio.com` — home carga
- ☐ Catálogo lista las 9 promociones con imágenes (servidas desde `cdn.wedomio.com`)
- ☐ Detalle de un inmueble abre y muestra el mapa
- ☐ Formulario de contacto → se crea el lead → llega el email (worker + Resend)
- ☐ `/panel/login` — entra con un usuario admin; edita una promoción; sube una imagen (va a R2)
- ☐ API pública: `curl https://wedomio.com/api/v1/promociones` con una API key responde; al exceder el límite devuelve `429` (confirma que Upstash está activo)
- ☐ `https://wedomio.com/sitemap.xml` y `/robots.txt` correctos

### H3. Backup automático (cron en el VPS, como `deploy`)
```bash
crontab -e
# añade:
0 3 * * * cd /opt/domio && make -f deploy/Makefile backup >> /opt/domio/backups/cron.log 2>&1
```
- ☐ Cron configurado

### H4. Primer deploy automático de prueba
Para validar que el CD funciona extremo a extremo:
1. Haz un cambio trivial en `main` (ej. un comentario en el README)
2. Haz push
3. Verifica en GitHub Actions que el workflow CD corre en verde
4. Verifica en el VPS que `docker ps` muestra los contenedores actualizados
- ☐ CD automático verificado

✅ **Puerta final:** los 2 health checks devuelven el `env` correcto y los smoke tests pasan.
**Ya está publicado.**

---

## Rollback rápido (si un deploy sale mal)

```bash
cd /opt/domio
# Fija el tag de imagen al anterior (o a un sha concreto) en deploy/env.prod:
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<sha-anterior>/' deploy/env.prod
make -f deploy/Makefile prod-up
```
Si la migración fue destructiva, restaura el `pg_dump` previo de `backups/`.

---

## Resumen de costes

| Concepto                                    | Coste             |
|---------------------------------------------|-------------------|
| Dominio wedomio.com                           | ~10 €/año         |
| VPS Hetzner CX22                            | ~4,5 €/mes        |
| Cloudflare / R2 / Resend / Sentry / Upstash / Turnstile | 0 € (free tier) |
| **Total**                                   | **~5 €/mes + 10 €/año** |

---

## Decisiones pendientes (que necesito de ti)

1. **¿El dominio `wedomio.com` ya está comprado?** Si no, hay que registrarlo primero (A1).
2. **¿Tienes ya cuenta de Cloudflare?** Si sí, se salta el registro pero no la configuración.
3. **¿El VPS ya está creado?** Si no, hay que crearlo en Hetzner Cloud.
4. **¿Las claves de terceros (R2/Resend/Sentry/Upstash/Turnstile) ya las tienes?** Si no, hay que crear las cuentas.
5. **¿Prefieres la vía E-opción 1 (CD automática) o E-opción 2 (build manual la primera vez)?**

> Dime por dónde vas y vamos ejecutando paso a paso juntos.