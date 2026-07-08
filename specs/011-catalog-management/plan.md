# Implementation Plan: Catalog Management (F011)

**Branch**: `feature/011-catalog-management` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-catalog-management/spec.md`

## Summary

CRUD completo de promociones, tipologías y unidades desde el backoffice (`/panel/catalogo`). Se implementa: (1) generador determinista de slugs, (2) `PromocionRepository` context-aware con todos los métodos de consulta/mutación, (3) API routes internas para CRUD + autoguardado de borrador, (4) listado con filtros, (5) formulario de edición por secciones con validación Zod compartida, (6) histórico de cambios inmutable, (7) revalidación ISR al guardar. El formulario organiza los campos en secciones Identidad, Estado comercial, Ubicación, SEO y Agente asignado, con gestión anidada de tipologías y unidades.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Drizzle ORM, Zod, Auth.js v5, Tailwind CSS v4

**Storage**: PostgreSQL 16 (Neon) con RLS, PostGIS para coordenadas

**Testing**: Vitest (unit/integration), @testing-library/react (componentes)

**Target Platform**: Web (Next.js SSR/ISR + backoffice)

**Project Type**: Web application (monorepo single-project)

**Performance Goals**: Listado con filtros < 2s, autoguardado cada 30s sin bloquear UI

**Constraints**: SET LOCAL obligatorio en transacciones, multi-tenant DNA, paginación por cursor en superficies públicas (no aplica al listado backoffice)

**Scale/Scope**: ~100 promociones por tenant en MVP, ~10 tipologías por promoción, ~20 unidades por tipología

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| §2 Scope Rule | ✅ PASS | Repositorio en `src/infrastructure/db/repositories/`, schemas Zod en `src/shared/schemas/` o `src/features/promociones/`, componentes en `src/features/promociones/components/` y `app/(auth)/panel/catalogo/` |
| §3 TDD | ✅ PASS | Tests unitarios para slug generator, PromocionRepository, validación Zod. Tests de integración para API routes. |
| §4 Linting | ✅ PASS | ESLint + sonarjs + jsx-a11y. Sin code smells. |
| §5 Security | ✅ PASS | Sin secrets en código. Validación Zod en cliente y servidor. |
| §6 Accessibility | ✅ PASS | Formularios con labels asociados, aria-live para autoguardado, focus-visible. |
| §11.1 Enums cerrados | ✅ PASS | Se consumen las constantes de `shared/constants/db-enums.ts`. Sin valores inventados. |
| §11.2 Dependencias explícitas | ✅ PASS | F010 (backoffice shell) y F009 (constantes + seed) ya implementadas. |
| §11.4 Historiales inmutables | ✅ PASS | `promocion_history` tiene RLS sin UPDATE/DELETE. El repositorio solo hace INSERT. |
| §11.6 Warnings suaves | ✅ PASS | construction_status vs plazos_garantias: warning no bloqueante. |
| Arch §2.3 Repos context-aware | ✅ PASS | `PromocionRepository` hereda de `TenantAwareRepository`. |
| Arch §7.18 Slugs persistentes | ✅ PASS | Slug se genera al publicar y nunca cambia. Test lo verifica. |
| Arch §7.14 Autoguardado no destructivo | ✅ PASS | `draft_payload` es columna independiente. Test verifica que no modifica campos publicados. |
| Arch §7.19 Warning suave | ✅ PASS | Warning si construction_status contradice plazos_garantias. No bloquea guardado. |

**No violations detected. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/011-catalog-management/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Zod schemas)
│   └── promocion-schema.ts
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── infrastructure/
│   ├── slug/
│   │   ├── generate-slug.ts           # Función pura determinista
│   │   └── generate-slug.spec.ts      # Tests
│   └── db/
│       └── repositories/
│           ├── promocion.repository.ts       # CRUD completo context-aware
│           ├── promocion.repository.spec.ts  # Tests
│           ├── tipologia.repository.ts       # CRUD tipologías
│           └── unidad.repository.ts          # CRUD unidades
├── shared/
│   └── schemas/
│       ├── promocion.schema.ts         # Zod schema compartido cliente/servidor
│       ├── tipologia.schema.ts
│       └── unidad.schema.ts
├── features/
│   └── promociones/
│       ├── components/
│       │   ├── catalog-list.tsx         # Listado con filtros
│       │   ├── catalog-filters.tsx      # Barra de filtros
│       │   ├── promocion-form.tsx       # Formulario de edición por secciones
│       │   ├── promocion-section-identity.tsx
│       │   ├── promocion-section-commercial-status.tsx
│       │   ├── promocion-section-location.tsx
│       │   ├── promocion-section-seo.tsx
│       │   ├── promocion-section-agent.tsx
│       │   ├── tipologia-editor.tsx     # Editor anidado de tipologías
│       │   ├── unidad-editor.tsx        # Editor anidado de unidades
│       │   ├── draft-indicator.tsx      # Indicador de borrador
│       │   └── history-panel.tsx        # Panel de histórico
│       └── hooks/
│           ├── use-autosave.ts          # Hook de autoguardado cada 30s
│           └── use-draft-restore.ts     # Hook para restaurar borrador
app/
├── (auth)/
│   └── panel/
│       └── catalogo/
│           ├── page.tsx                 # Listado (reemplaza placeholder)
│           ├── nueva/
│           │   └── page.tsx             # Creación (redirige a edición)
│           └── [id]/
│               ├── page.tsx             # Edición
│               └── history/
│                   └── page.tsx         # Histórico de cambios
└── api/
    └── internal/
        └── promociones/
            ├── route.ts                 # GET (listado) + POST (crear)
            ├── [id]/
            │   ├── route.ts             # GET + PATCH + DELETE
            │   └── draft/
            │       └── route.ts         # PATCH autoguardado
            └── [id]/
                └── history/
                    └── route.ts         # GET histórico
tests/
└── unit/
    └── slug/
        └── generate-slug.spec.ts
```

**Structure Decision**: Estructura de proyecto único (monorepo Next.js). Se aplica la Scope Rule de constitution.md: lógica compartida (schemas Zod, slug generator) en `shared/` o `infrastructure/`, lógica específica de feature en `features/promociones/`, rutas en `app/(auth)/panel/catalogo/` y `app/api/internal/promociones/`.

## Complexity Tracking

No violations to justify. All constitution rules pass.
