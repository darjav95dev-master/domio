# Deploy — Domio

Un VPS, dos stacks (`domio-dev`, `domio-prod`) + un proxy Caddy compartido, detrás
de Cloudflare. Imágenes en GHCR. Flujo: `develop` → dev, `main`/tag → prod.

## Topología

```
Cloudflare (DNS + proxy + SSL borde)
   │
VPS ── Caddy (:80/:443, TLS Let's Encrypt) ── red docker "domio-web"
        ├─ domio-prod: web + worker + postgres(postgis) + volumen pgdata
        └─ domio-dev : web + worker + postgres(postgis) + volumen pgdata
Externos (free tier): R2 (imágenes) · Resend (email) · Sentry · Upstash (rate limit)
```

## Regla de secretos

**En el repositorio NO hay ni una sola contraseña, token o cadena de conexión.**
Los secretos viven en dos sitios y solo ahí:

1. **El servidor (VPS):** ficheros `.env.production`, `.env.development`,
   `deploy/env.prod`, `deploy/env.dev` — creados *en el VPS*, gitignored, con las
   contraseñas **generadas ahí mismo** (nunca salen del servidor).
2. **GitHub → Settings → Environments** (`production`/`development`): los secretos
   que necesita el pipeline de CD (SSH, claves de build).

El repo solo documenta *qué* variables hacen falta (`.env.example` y este README).

## Puesta en marcha (primera vez, en el VPS)

Los ficheros de entorno **se crean en el servidor**. Este bloque genera las
contraseñas *in situ* con `openssl` (no se teclean ni se copian de ningún lado)
y deja como único paso manual pegar las claves de terceros (R2, Resend, Sentry,
Upstash, Turnstile).

```bash
cd /opt/domio        # repo clonado en el VPS

# ── Contraseñas de Postgres: generadas aquí, distintas por entorno ──
PROD_PG=$(openssl rand -base64 24 | tr -dc A-Za-z0-9 | head -c 24)
DEV_PG=$(openssl rand -base64 24 | tr -dc A-Za-z0-9 | head -c 24)

# ── deploy/env.proxy — dominios ──
cat > deploy/env.proxy <<'EOF'
PROD_DOMAIN=domio.com
DEV_DOMAIN=dev.domio.com
EOF

# ── deploy/env.prod / deploy/env.dev — variables de deploy ──
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

# ── .env.production — secretos de la app (AUTH_SECRET generado aquí) ──
cat > .env.production <<EOF
APP_ENV=production
NEXT_PUBLIC_APP_ENV=production
DATABASE_URL=postgresql://domio:$PROD_PG@postgres:5432/domio
PUBLIC_TENANT_ID=00000000-0000-0000-0000-000000000001
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_URL=https://domio.com
R2_ACCOUNT_ID=RELLENAR
R2_ACCESS_KEY_ID=RELLENAR
R2_SECRET_ACCESS_KEY=RELLENAR
R2_BUCKET=domio-prod
R2_PUBLIC_URL=https://cdn.domio.com
RESEND_API_KEY=RELLENAR
SENTRY_DSN=RELLENAR
RATE_LIMIT_STORE_URL=RELLENAR
RATE_LIMIT_STORE_TOKEN=RELLENAR
NEXT_PUBLIC_TURNSTILE_SITE_KEY=RELLENAR
TURNSTILE_SECRET_KEY=RELLENAR
NEXT_PUBLIC_SITE_URL=https://domio.com
EOF

# ── .env.development — igual, dominio dev ──
cat > .env.development <<EOF
APP_ENV=development
NEXT_PUBLIC_APP_ENV=development
DATABASE_URL=postgresql://domio:$DEV_PG@postgres:5432/domio
PUBLIC_TENANT_ID=00000000-0000-0000-0000-000000000001
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_URL=https://dev.domio.com
R2_ACCOUNT_ID=RELLENAR
R2_ACCESS_KEY_ID=RELLENAR
R2_SECRET_ACCESS_KEY=RELLENAR
R2_BUCKET=domio-dev
R2_PUBLIC_URL=https://cdn-dev.domio.com
RESEND_API_KEY=RELLENAR
SENTRY_DSN=RELLENAR
RATE_LIMIT_STORE_URL=RELLENAR
RATE_LIMIT_STORE_TOKEN=RELLENAR
NEXT_PUBLIC_TURNSTILE_SITE_KEY=RELLENAR
TURNSTILE_SECRET_KEY=RELLENAR
NEXT_PUBLIC_SITE_URL=https://dev.domio.com
EOF

chmod 600 .env.production .env.development deploy/env.*

# ── Ahora edita las líneas RELLENAR con tus claves reales de R2/Resend/Sentry/Upstash/Turnstile ──
$EDITOR .env.production .env.development

# ── Login en GHCR (token con read:packages) ──
echo "$GHCR_TOKEN" | docker login ghcr.io -u darjav95dev-master --password-stdin

# ── Red + proxy + stacks ──
make -f deploy/Makefile proxy-up
make -f deploy/Makefile prod-up
make -f deploy/Makefile dev-up
```

> Estos ficheros **solo existen en el VPS**. Nunca los copies a tu máquina ni al
> repo. Guarda una copia cifrada (gestor de contraseñas) por si reinstalas.

## Migrar los datos reales (del contenedor local a un entorno)

El backup ya está en `backups/` (extraído del contenedor `domio-postgres`).
Súbelo al VPS y:

```bash
deploy/scripts/migrate-data.sh domio-prod backups/domio_appdata_YYYYMMDD.dump
deploy/scripts/migrate-data.sh domio-dev  backups/domio_appdata_YYYYMMDD.dump
```

> El script aplica las 8 migraciones (esquema limpio) y luego carga solo los datos
> de aplicación. **Requisito previo:** PostGIS lo crea el contenedor al iniciar
> (`init-postgis.sql`); las migraciones NO lo crean.

## Operación diaria

```bash
make -f deploy/Makefile prod-up        # desplegar última imagen prod
make -f deploy/Makefile prod-migrate   # aplicar migraciones
make -f deploy/Makefile logs-prod      # ver logs
make -f deploy/Makefile backup         # pg_dump manual
```

## Backup automático (cron en el VPS)

```cron
0 3 * * *  cd /opt/domio && make -f deploy/Makefile backup && \
           rclone copy backups/ r2:domio-backups/  # o aws s3 cp a R2
```

## Rollback

Las imágenes se etiquetan por `sha`/tag. Para volver atrás, fija `IMAGE_TAG` al
tag anterior en `deploy/env.prod` y `make -f deploy/Makefile prod-up`. Si la
migración fue *contract* (destructiva), restaura el `pg_dump` previo.

## Publicar en domio.com (dominio + DNS + SSL)

El **código ya apunta a domio.com** (Caddyfile, `AUTH_URL`, `NEXT_PUBLIC_SITE_URL`).
Falta la parte de infraestructura, que se hace una sola vez:

1. **Registrar `domio.com`** en un registrador (Cloudflare Registrar, Namecheep,
   Donvoin…). *(Esto es una compra/alta de cuenta: la haces tú.)*
2. **Añadir el dominio a Cloudflare** (plan Free) y apuntar los *nameservers* del
   registrador a los que te dé Cloudflare.
3. **Registros DNS en Cloudflare** (`IP` = IP pública del VPS):

   | Tipo | Nombre | Contenido | Proxy |
   |------|--------|-----------|-------|
   | A | `domio.com` (`@`) | `IP_DEL_VPS` | ✅ Proxied |
   | A | `dev`   | `IP_DEL_VPS` | ✅ Proxied |
   | A | `cdn`   | (endpoint público de R2) | según R2 |

4. **SSL/TLS en Cloudflare** → modo **Full (Strict)**. Caddy emite el certificado
   de origen (Let's Encrypt) automáticamente al arrancar `proxy-up`.
5. **Abrir puertos en el VPS**: 80, 443 y 22 (firewall).
6. Levantar `proxy-up` + `prod-up`. Caddy resuelve el certificado y en unos
   minutos `https://domio.com` responde.

Verificación:
```bash
curl -s https://domio.com/api/health      # → {"status":"ok","env":"production"}
curl -s https://dev.domio.com/api/health   # → {"status":"ok","env":"development"}
```

> Lo que **no puedo hacer por ti**: comprar el dominio, crear la cuenta de
> Cloudflare/registrador ni entrar en ellas. Son acciones de cuenta/pago tuyas.
> Todo lo demás (config, Caddy, DNS a nivel de qué registros crear) está aquí.
