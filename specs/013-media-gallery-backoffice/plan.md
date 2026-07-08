# Implementation Plan: Media Gallery Backoffice

**Branch**: `feature/013-media-gallery-backoffice` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-media-gallery-backoffice/spec.md`

## Summary

Implementar la gestión de medios (imágenes de galería y planos) desde el backoffice de una promoción. Se integran los componentes UI de subida, reordenación drag & drop, marca de portada, y validación de alt_text obligatorio dentro del formulario de edición de promoción existente. El backend ya existe (MediaService de F006), esta feature añade la capa de presentación y las server actions para orquestar las operaciones.

## Technical Context

**Language/Version**: TypeScript strict (Next.js 15, App Router)

**Primary Dependencies**: Drizzle ORM, Zod, Next.js Server Actions, React (Server Components + Client Components), @dnd-kit/sortable (ya instalado en F012)

**Storage**: PostgreSQL 16 (Neon) con RLS, tabla `media_assets` existente. Cloudflare R2 para archivos.

**Testing**: Vitest (unit + integration), Playwright (E2E — fuera de alcance en esta feature, F026)

**Target Platform**: Web (Vercel hosting)

**Project Type**: Web application (SaaS multi-tenant inmobiliario)

**Performance Goals**: Subida de imagen < 5s, reordenación < 1s

**Constraints**: Multi-tenant DNA (SET LOCAL), validación Zod cliente+servidor, alt_text obligatorio, constraint parcial UNIQUE para portada

**Scale/Scope**: 2 tipos de media (IMAGE_GALLERY, PLAN), ~10 tareas de implementación

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Scope Rule (§2) | ✅ PASS | Componentes de media van en `features/promociones/components/` (específico de feature). MediaService ya existe en `infrastructure/media/`. |
| TDD (§3) | ✅ PASS | Tests unitarios para validación y tests de integración para operaciones de repositorio antes de implementación. |
| Zod validation (§4) | ✅ PASS | Schemas Zod para alt_text y payloads. Validación en cliente y servidor. |
| Multi-tenant DNA (§2.1) | ✅ PASS | Todas las operaciones pasan por repositorio context-aware con SET LOCAL. |
| WCAG AA a11y (§6) | ✅ PASS | alt_text obligatorio para todas las imágenes. aria-label en botones de acción. |
| Upload desde servidor (arch §1) | ✅ PASS | El cliente envía binario a endpoint interno; el servidor firma y coloca en R2. Nunca se emiten credenciales R2 al navegador. |
| Enums cerrados (§11.1) | ✅ PASS | MediaKind ya definido en `shared/constants/db-enums.ts`. |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/013-media-gallery-backoffice/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── spec.md              # Feature specification
├── checklists/          # Quality checklists
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── features/
│   └── promociones/
│       ├── components/
│       │   ├── media-gallery.tsx          # Client component: galería + drag & drop
│       │   ├── media-upload-dialog.tsx    # Diálogo de subida con alt_text
│       │   └── media-preview.tsx          # Wrapper sobre MediaImage para preview
│       └── actions/
│           └── media.actions.ts           # Server actions: upload, reorder, setCover, delete
├── infrastructure/
│   └── media/
│       └── MediaService.ts               # Ya existe (F006) — se consume, no se modifica
└── app/
    └── (auth)/panel/catalogo/[id]/
        └── page.tsx                       # Integrar sección de medios

tests/
├── integration/
│   └── media-operations.test.ts           # Tests de integración para operaciones de media
└── unit/
    └── media-validation.test.ts           # Tests de validación Zod
```

**Structure Decision**: Single project (Next.js). Media gallery components live in `features/promociones/components/` because they are specific to the catalog management feature. MediaService ya existe en F006 y se consume sin modificar.

## Complexity Tracking

> No violations to justify — all constitution gates pass.
