# Plan para mañana — verificación de prod/dev + automatización del despliegue

> Estado actual: **prod y dev desplegados** en el VPS (7 contenedores up, TLS OK,
> datos cargados, contraseña de admin cambiada). El despliegue es **manual** todavía.
> Objetivo de mañana: (1) probar TODAS las integraciones, (2) arreglar lo que falle,
> (3) dejar el despliegue **automático** (push → deploy).

Leyenda: ✅ hecho · ⬜ por hacer · ⚠️ posible problema conocido.

---

## PARTE 1 — Batería de pruebas (smoke tests)

Para cada integración: **cómo probarla · qué esperar · qué demuestra**. Hazlas en
**producción** (`wedomio.com`) y repite las esenciales en **dev** (`dev.wedomio.com`).

### 1.1 Web y salud
- ⬜ `curl -s https://wedomio.com/api/health` → `{"status":"ok","env":"production"}`
- ⬜ `curl -s https://dev.wedomio.com/api/health` → `...","env":"development"}`
- ⬜ Home `https://wedomio.com` carga.
- ⬜ `https://wedomio.com/portafolio` muestra **9 promociones** con imágenes (Unsplash).
- ⬜ Abrir el detalle de un inmueble → carga ficha + mapa.

### 1.2 Autenticación / Backoffice
- ⬜ `https://wedomio.com/panel/login` con `admin@domio.dev` + **nueva contraseña** → entra.
- ⬜ Catálogo → editar una promoción → guardar → se refleja en la web pública.
- ⬜ Ver `/panel/leads` → aparecen los 7 leads (datos personales — cuidado RGPD).
- ⬜ **Confirmar que los otros 4 usuarios demo NO entran** (rotados o desactivados).

### 1.3 R2 — subida de imágenes (backoffice)
- ⬜ `/panel/catalogo/[id]` → subir una imagen a la galería.
- ⬜ Verificar en **Cloudflare → R2 → bucket `domio-prod`** que aparece el objeto nuevo.
- ⚠️ **Posible fallo:** la imagen sube a R2 pero **no se ve** en la web. Causa conocida:
  `next.config.ts` calcula el hostname permitido de imágenes con `R2_PUBLIC_URL` **en build**,
  y no pasamos esa variable como `--build-arg` → quedó `placeholder.com`, así que Next
  rechaza `cdn.wedomio.com`. **Si pasa → tarea de la Parte 4 (rebuild con el build-arg).**
- ✅ Nota: las 54 imágenes del catálogo son URLs de Unsplash y **no** dependen de R2.

### 1.4 Resend — email (flujo de leads)
- ⬜ **Requisito previo:** en Resend, dominio `wedomio.com` **verificado** (registros SPF/DKIM
  añadidos en Cloudflare). Sin esto los emails no se entregan / van a spam.
- ⬜ Enviar el **formulario de contacto** en la web → debe crear un lead.
- ⬜ Ver que el **worker** procesa la cola:
  ```bash
  docker logs domio-prod-worker-1 --tail=30
  ```
- ⬜ Comprobar la cola en la BBDD (debe pasar a `sent`):
  ```bash
  docker compose -p domio-prod --env-file deploy/env.prod -f deploy/docker-compose.app.yml \
    exec -T postgres psql -U domio -d domio -c "select status, count(*) from email_queue group by status;"
  ```
- ⬜ Confirmar que llega el email de notificación.
- **Demuestra:** cola de emails + worker + Resend end-to-end.

### 1.5 Sentry — errores
- ⬜ Provocar un error controlado (p. ej. visitar una ruta que falle) y ver que **aparece
  en el dashboard de Sentry** del proyecto de producción.
- ⬜ Verificar que el DSN de prod recibe (y el de dev por separado si lo separaste).

### 1.6 Rate limiting — Upstash
- ⬜ Golpear repetidamente el login o la API hasta recibir **HTTP 429**:
  ```bash
  for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}\n" https://wedomio.com/api/v1/promociones; done
  ```
  (o intentos de login fallidos seguidos).
- **Demuestra:** Upstash activo (ya sabemos que sí, porque prod arrancó sin caer por la guarda).

### 1.7 Turnstile — captcha anti-bot
- ⬜ El formulario de contacto muestra el **widget de Turnstile**.
- ⬜ Un envío legítimo pasa; un envío sin token válido se **rechaza** en el servidor.

### 1.8 API pública v1
- ⬜ Crear una **API key** en `/panel/api-keys`.
- ⬜ Consumirla:
  ```bash
  curl -H "Authorization: Bearer TU_API_KEY" https://wedomio.com/api/v1/promociones
  ```
  → devuelve promociones.
- ⬜ Exceder el límite → **429** (confirma rate limit por key).

### 1.9 SEO
- ⬜ `https://wedomio.com/sitemap.xml` y `/robots.txt` correctos.
- ⬜ Meta tags / Open Graph en una ficha de inmueble.

### 1.10 DEV
- ⬜ Repetir 1.1–1.4 en `dev.wedomio.com`.
- ⚠️ dev sirve el mismo contenido → conviene **noindex** (Parte 4) para que Google no lo indexe.

---

## PARTE 2 — Seguridad pendiente (del triaje de hoy)

- ⬜ **Cloudflare en NARANJA + SSL Full (Strict)** — confirmar con `dig +short wedomio.com`
  (debe mostrar IPs de Cloudflare `188.114.x.x`, no `195.201.96.67`).
- ⬜ **Rotar o desactivar** los 4 usuarios demo restantes (aún con `Domio2026!`).
- ⬜ **Endurecer SSH**: en `/etc/ssh/sshd_config` → `PermitRootLogin no` y
  `PasswordAuthentication no` (solo clave). Reinicia `sshd`. *(Verifica antes que entras con
  la clave `deploy` para no quedarte fuera.)*
- ⬜ **Firewall a Cloudflare**: una vez en naranja, permitir 80/443 **solo** desde los rangos
  de IP de Cloudflare (así nadie llega al origen por IP directa).
- ⬜ **Permisos de secretos**: `ls -l /opt/domio/.env.*` → deben ser `-rw-------` (600).

---

## PARTE 3 — Automatizar el despliegue (CI/CD)

**Meta:** `push a develop` → despliega **dev** · `push/merge a main` → despliega **prod**.
Ya existe el workflow [`.github/workflows/cd.yml`](../.github/workflows/cd.yml). Falta activarlo:

### 3.1 Poner `main` al día
`main` está muy por detrás de `develop` (no tiene ni el Dockerfile ni `deploy/`). Merge:
```bash
# En tu Mac
git checkout main && git merge develop && git push
git checkout develop
```

### 3.2 Secrets y variables en GitHub
GitHub → repo `domio` → **Settings → Environments** → crear `production` y `development`:

| Entorno | Tipo | Nombre | Valor |
|---------|------|--------|-------|
| production | Secret | `SSH_HOST` | `195.201.96.67` |
| production | Secret | `SSH_USER` | `deploy` |
| production | Secret | `SSH_KEY` | *(contenido de `~/.ssh/domio_deploy`, clave privada completa)* |
| production | Secret | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *(site key de Turnstile)* |
| production | Variable | `NEXT_PUBLIC_APP_ENV` | `production` |
| production | Variable | `NEXT_PUBLIC_SITE_URL` | `https://wedomio.com` |
| development | Secret | `SSH_HOST` | `195.201.96.67` *(mismo VPS)* |
| development | Secret | `SSH_USER` | `deploy` |
| development | Secret | `SSH_KEY` | *(la misma clave privada)* |
| development | Secret | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *(site key)* |
| development | Variable | `NEXT_PUBLIC_APP_ENV` | `development` |
| development | Variable | `NEXT_PUBLIC_SITE_URL` | `https://dev.wedomio.com` |

`GITHUB_TOKEN` no hay que crearlo (lo inyecta GitHub). Las claves de R2/Resend/Sentry/Upstash
**NO** van en GitHub: viven en los `.env.*` del VPS.

### 3.3 Estrategia de checkout en el VPS
El workflow hace `git pull` en `/opt/domio` durante el deploy. Como los ficheros de
`deploy/` son **idénticos en main y develop** (tras el merge), **deja el checkout del VPS
en `main`**: la CD refresca la infra desde main y cada stack tira de su **imagen** por tag
(`prod`=`latest`, `dev`=`develop`), que es lo que diferencia los entornos.
```bash
# En el VPS, una vez
cd /opt/domio && git checkout main && git pull
```
> (Si prefieres aislar del todo dev y prod, más adelante se pueden separar en dos checkouts
> o dos directorios; para el TFM, uno en main basta.)

### 3.4 Probar el CD
1. Un cambio pequeño en `develop` → `git push` → **Actions** debe correr `build-and-push` +
   `deploy` (a dev) en verde. Verifica en `dev.wedomio.com`.
2. Merge a `main` → despliega **prod**. Verifica en `wedomio.com`.
3. Revisar que el paso de **healthcheck + rollback** del workflow se comporta bien.

---

## PARTE 4 — Fixes conocidos pendientes

- ⬜ **R2 build-arg**: pasar `R2_PUBLIC_URL=https://cdn.wedomio.com` como `--build-arg` en la
  imagen web (y añadirlo al `Dockerfile`/CD) para que `next.config.ts` permita `cdn.wedomio.com`
  y se vean las imágenes **subidas desde el backoffice**. (No afecta al catálogo Unsplash.)
- ⬜ **Resend**: verificar el dominio `wedomio.com` (SPF/DKIM) para que los emails se entreguen.
- ⬜ **dev noindex**: servir `X-Robots-Tag: noindex` (o robots.txt disallow) en `dev.wedomio.com`.
- ⬜ **Origin Certificate de Cloudflare**: para que la renovación del cert de Caddy no falle en
  ~90 días estando en naranja. Alternativa: dejar documentado y renovar en gris puntualmente.

---

## Orden sugerido para mañana

1. **Seguridad rápida** (Parte 2): confirmar naranja + rotar/desactivar usuarios demo.
2. **Smoke tests de prod** (Parte 1): web → auth → email → R2 → Sentry → rate limit → API.
3. **Arreglar lo que falle** (Parte 4): casi seguro el R2 build-arg y el dominio de Resend.
4. **Smoke tests de dev**.
5. **Activar el CD** (Parte 3): merge → secrets → probar push a develop y a main.
6. Endurecer SSH + firewall Cloudflare (Parte 2) al final, con calma.
