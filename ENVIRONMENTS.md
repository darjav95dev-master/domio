# Entornos y configuración

El proyecto distingue **tres entornos**, seleccionados por la variable semántica
`APP_ENV` (independiente de `NODE_ENV`), cada uno con su propio fichero `.env`.

| Entorno | `APP_ENV` | Imágenes | Fichero | Se carga con |
|---------|-----------|----------|---------|--------------|
| **Local** (tu máquina) | `local` | `/public` (placeholders, sin R2) | `.env.local` | `pnpm dev` |
| **Development** (servidor dev/staging) | `development` | Cloudflare **R2 dev** | `.env.development` | `pnpm build:development` + `pnpm start:development` |
| **Production** | `production` | Cloudflare **R2 prod** | `.env.production` | `pnpm build:production` + `pnpm start:production` |

## Por qué `APP_ENV` y no solo `NODE_ENV`

`NODE_ENV` solo vale `development` (con `next dev`) o `production` (con
`next build`/`start`). Un servidor de desarrollo desplegado también corre un
build de producción → `NODE_ENV=production`, igual que producción. No se pueden
distinguir. `APP_ENV` sí los separa.

## Cómo se carga cada fichero

Los scripts pasan el fichero con la bandera nativa de Node `--env-file`
(Node ≥ 20.12). No hace falta ninguna dependencia extra.

```jsonc
"dev":                "next dev",                       // local → .env.local (Next lo carga solo)
"dev:server":         "... --env-file-if-exists=.env.development next dev",
"build:development":  "... --env-file=.env.development   next build",
"start:development":  "... --env-file=.env.development   next start",
"build:production":   "... --env-file=.env.production    next build",
"start:production":   "... --env-file=.env.production    next start",
```

- `pnpm dev` sigue funcionando **exactamente como ahora**: Next carga `.env.local`.
- `pnpm dev:server` levanta el dev server con la config de R2 en tu máquina
  (para probar R2 en local).
- Las variables `NEXT_PUBLIC_*` se incrustan en tiempo de **build**, por eso hay
  un `build:*` por entorno.

## Puesta en marcha

```bash
# Local (ya listo)
cp .env.example .env.local            # si no lo tienes; edita valores
pnpm dev

# Development / Production
# Los ficheros .env.development y .env.production ya existen (gitignored) con los
# valores reales; solo hay que rellenar las credenciales de terceros (RELLENAR).
pnpm build:development && pnpm start:development
pnpm build:production && pnpm start:production
```

## Ficheros

Commiteado (plantilla, sin secretos): `.env.example`.
Ignorados por git (valores reales): `.env.local`, `.env.development`,
`.env.production`.

## En un hosting (Vercel / Cloudflare / Docker)

No subas los ficheros con secretos. Define las **mismas variables** (incluido
`APP_ENV` y `NEXT_PUBLIC_APP_ENV`) como *environment variables* de la plataforma;
el código lee `process.env` igual. Los ficheros `.env.*` son para desarrollo y
como referencia de qué variables necesita cada entorno.

## Verificar qué config cargó un servidor

`GET /api/health` devuelve `{ "status": "ok", "env": "<APP_ENV>" }`, así confirmas
que el servidor arrancó con el entorno correcto.
