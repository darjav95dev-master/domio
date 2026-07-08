# Implementation Plan: Rate Limiting & Observability

**Branch**: `feature/008-rate-limiting-and-observability` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-rate-limiting-and-observability/spec.md`

## Summary

Implementar dos capacidades de infraestructura transversal: (1) rate limiting con contadores deslizantes vía Upstash Redis/Vercel KV para proteger la API pública (`/api/v1/*`, por key) y los formularios sensibles (login, contacto, por IP), con degradación graceful si el almacén no responde; (2) observabilidad con Sentry client + serverless, inyectando `tenant_id` en cada evento, más error boundaries en React. Ambos módulos son transversales — los consumirá toda superficie pública posterior (F020, F022, F024).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15.5 (App Router), `@upstash/redis` (rate limiting), `@sentry/nextjs` (observabilidad)

**Storage**: Upstash Redis / Vercel KV (contadores de rate limiting). PostgreSQL 16 (Neon) no se modifica en esta feature — solo se lee `api_keys.rate_limit_per_min`.

**Testing**: Vitest + @testing-library/react (unit/component), mocks para Upstash y Sentry

**Target Platform**: Vercel (serverless) + navegador (client components)

**Project Type**: Web application (Next.js App Router, SSR/ISR)

**Performance Goals**: Rate limiter añade <5ms de latencia por request (Redis lookup). Sentry no bloquea el render.

**Constraints**: Degradación graceful obligatoria — si Upstash cae, la request pasa sin límite. Si Sentry no responde, el error se pierde pero la app sigue.

**Scale/Scope**: MVP single-tenant operativamente. Rate limiting soporta N tenants cuando el modelo escale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio (constitution.md) | Estado | Justificación |
|---|---|---|
| §1 Stack Next.js/TypeScript/pnpm | ✅ PASS | Se usan las tecnologías del stack declarado |
| §2 Scope Rule | ✅ PASS | Rate limiting → `src/infrastructure/rate-limiting/`. Sentry → `src/infrastructure/observability/`. ErrorBoundary → `src/shared/components/`. |
| §3 TDD obligatorio | ✅ PASS | Cada módulo se implementa con ciclo RED→GREEN→REFACTOR |
| §4 ESLint + SonarJS + jsx-a11y | ✅ PASS | No se violan reglas de complejidad ni duplicación |
| §5 Secrets en env vars | ✅ PASS | SENTRY_DSN y RATE_LIMIT_STORE_URL ya están en .env.example. Nunca hardcodeados. |
| §6 Accesibilidad WCAG AA | ✅ PASS | Error boundary usa `role="alert"`, `aria-live="polite"`. Fallback con botón reintentar accesible. |
| §7 Sentry con tracesSampleRate | ✅ PASS | 0.1 prod / 1.0 dev, DSN en env var, tenant_id en eventos |
| §8 Commits convencionales | ✅ PASS | Se aplicará al commit final |
| §11.1 Enums cerrados | ✅ PASS | No se introducen enums nuevos — se consumen constantes existentes si aplica |
| §11.3 Servicios externos no síncronos en path crítico | ✅ PASS | Rate limiting es inline (no es un "envío" — es una verificación). Su caída degrada graceful. |

**Veredicto**: Todas las gates pasan. No hay violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/008-rate-limiting-and-observability/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (interfaces del rate limiter y sentry wrapper)
├── checklists/          # Quality checklists
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/infrastructure/
├── rate-limiting/
│   ├── rate-limiter.ts           # Interfaz + implementación con Upstash
│   ├── rate-limiter.types.ts     # Tipos: RateLimitConfig, RateLimitResult
│   └── rate-limiter.spec.ts      # Tests unitarios
├── observability/
│   ├── sentry.client.config.ts   # Sentry client-side config
│   ├── sentry.server.config.ts   # Sentry server-side config
│   ├── sentry.wrapper.ts         # Wrapper que inyecta tenant_id
│   └── sentry.wrapper.spec.ts    # Tests unitarios
└── [existing: db/, email/, media/, tenant/]

src/shared/components/
├── error-boundary.tsx             # ErrorBoundary component
├── error-boundary.spec.tsx        # Tests de componente
└── [existing: ...]

app/
├── layout.tsx                     # Integración ErrorBoundary + Sentry
├── global-error.tsx               # Next.js global error handler → Sentry
└── [existing: ...]

sentry.edge.config.ts              # Edge runtime config (si aplica)
instrumentation.ts                 # Next.js instrumentation hook para Sentry
```

**Structure Decision**: Seguir la estructura existente del repositorio (constitution §2 Scope Rule). Módulos de infraestructura en `src/infrastructure/`, componentes compartidos en `src/shared/components/`. No se crean directorios nuevos fuera de esta convención.

## Complexity Tracking

> No violations to justify — all constitution gates pass.
