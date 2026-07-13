# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Domio — imagen multi-stage.
#   target `runner` → web (Next standalone, mínima, sin devDeps)
#   target `tools`  → worker de emails + migraciones/seed (necesita tsx, drizzle-kit,
#                     src/ y las migraciones, que NO van en el standalone).
# Node 20 (engines del package.json). pnpm vía corepack.
# ---------------------------------------------------------------------------
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ── deps: todas las dependencias (incluye dev, necesarias para build/worker) ──
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── builder: compila el standalone ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* se incrustan en build: se pasan como build-args por entorno.
ARG NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN pnpm build

# ── runner: web en producción (standalone) ──
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
# healthcheck lo hace Caddy/compose contra /api/health; aquí solo el arranque.
CMD ["node", "server.js"]

# ── tools: worker de emails + migraciones/seed ──
# ponytail: reutiliza el builder (trae tsx, drizzle-kit, src y migraciones).
# Si el tamaño de imagen importara, precompilar el worker a un JS slim.
FROM builder AS tools
ENV NODE_ENV=production
CMD ["pnpm", "worker:emails"]
