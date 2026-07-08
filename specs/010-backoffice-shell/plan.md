# Implementation Plan: backoffice-shell

**Branch**: `feature/010-backoffice-shell` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-backoffice-shell/spec.md`

## Summary

Construir el shell estructural del backoffice de Domio: un layout con sidebar fijo 240px (`bg.inverted`), auth guard con redirección a login, navegación condicional por rol (ADMIN/OPERATOR/AGENT), badge de leads no leídos con refresco cada 30s, dashboard operativo de bienvenida (sin analítica), header con identidad y logout, y protección contra indexación (`X-Robots-Tag: noindex` + `robots.ts`). Esta feature establece la base sobre la que se montarán todas las features de gestión posteriores (F011 catálogo, F014 leads, F016 equipo, F017 contenidos, etc.).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Auth.js v5 (next-auth), React 19, Tailwind CSS v4, Drizzle ORM, Zod, @phosphor-icons/react

**Storage**: PostgreSQL 16 en Neon (tablas `lead_read_marks`, `promociones`, `users` ya existen del schema F002)

**Testing**: Vitest para tests unitarios y de componentes. Playwright para E2E de los recorridos del backoffice.

**Target Platform**: Node.js >= 20, Next.js 15 (App Router)

**Project Type**: Web application (SaaS multi-tenant inmobiliario) — esta feature es de UI/infraestructura para el backoffice.

**Performance Goals**: Dashboard carga en < 2s (Lighthouse Performance ≥ 80). Badge se actualiza en ≤ 31s tras cambio.

**Constraints**: WCAG AA obligatorio. `aria-live="polite"` para badge. Sidebar responsivo (drawer en móvil < 768px). Sin dark mode.

**Scale/Scope**: 1 layout, 1 dashboard page, 1 sidebar component, 1 nav component, 1 badge component, 1 header component, 1 route handler (unread-count), 1 middleware, 1 robots.ts. ~10 archivos nuevos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regla | Estado | Justificación |
|-------|--------|---------------|
| §2 Scope Rule | ✅ PASS | Componentes del sidebar en `src/features/backoffice/components/` (solo los usa el backoffice). Layout en `app/(auth)/panel/layout.tsx`. Route handler en `app/api/internal/leads/unread-count/route.ts`. |
| §3 TDD | ✅ PASS | Tests de componentes sidebar/nav/badge con Testing Library. Tests de route handler con Supertest/vitest. |
| §6 Accesibilidad | ✅ PASS | `aria-live="polite"` en badge. `aria-label` en botón logout si es icon-only. Focus-visible en nav items. Contraste AA verificado con tokens existentes. |
| §11.1 Constantes centralizadas | ✅ PASS | Usa `USER_ROLES` y `USER_ROLE_LABELS` desde `shared/constants/`. Nav config como constante en feature. |
| §11.5 Dependencias del sistema de diseño | ✅ PASS | Los tokens (bg.inverted, fg.on-inverted, accent) ya existen en globals.css (F003). Los primitives (Button, Skeleton) ya existen en shared/components. |
| Architecture §4.2 | ✅ PASS | Auth guard usa Auth.js session. Middleware inyecta X-Robots-Tag. Roles ADMIN/OPERATOR/AGENT desde db-enums. |
| Architecture §7.11 | ✅ PASS | `X-Robots-Tag: noindex, nofollow` en middleware para rutas `(auth)`. `robots.ts` excluye `/panel`. |

**Gate result**: PASS — sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/010-backoffice-shell/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── (auth)/
│   ├── layout.tsx                    # MODIFICAR — añadir X-Robots-Tag header
│   └── panel/
│       ├── layout.tsx                # NUEVO — sidebar + auth guard + header
│       └── page.tsx                  # NUEVO — dashboard operativo
├── api/
│   └── internal/
│       └── leads/
│           └── unread-count/
│               └── route.ts          # NUEVO — GET conteo leads no leídos
└── robots.ts                         # NUEVO — robots.txt con Disallow: /panel

src/
├── features/
│   └── backoffice/
│       └── components/
│           ├── sidebar.tsx           # NUEVO — sidebar fijo 240px
│           ├── nav-item.tsx          # NUEVO — item de navegación con estado activo
│           ├── unread-badge.tsx      # NUEVO — badge con refresco 30s
│           ├── panel-header.tsx      # NUEVO — header con nombre + logout
│           └── dashboard-content.tsx # NUEVO — contenido del dashboard
├── infrastructure/
│   ├── auth/
│   │   ├── auth.config.ts           # NUEVO — Auth.js config (si no existe de F005)
│   │   └── session.ts               # NUEVO — helper para obtener sesión server-side
│   └── db/
│       └── repositories/
│           └── lead-read.repository.ts # NUEVO — consulta de unread count
└── middleware.ts                      # NUEVO — auth guard + X-Robots-Tag
```

**Structure Decision**: Estructura de proyecto único (Next.js monorepo). Los componentes del backoffice viven en `src/features/backoffice/` porque son específicos de esta superficie. El middleware y robots.ts son globales. El route handler de unread-count vive en `app/api/internal/` como endpoint interno del backoffice.

## Complexity Tracking

No violations to track. All constitution gates pass.
