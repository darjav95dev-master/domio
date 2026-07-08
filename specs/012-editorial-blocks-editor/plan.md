# Implementation Plan: Editorial Blocks Editor

**Branch**: `feature/012-editorial-blocks-editor` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-editorial-blocks-editor/spec.md`

## Summary

Implementar el editor de bloques editoriales estructurados para promociones del backoffice. Se añaden los métodos de escritura al repositorio (create, update, delete, reorder), la validación Zod por block_type con restricción por kind (portfolio vs external), un constraint CHECK en BD, y los componentes UI para crear, editar, reordenar y eliminar bloques dentro del formulario de edición de promoción existente.

## Technical Context

**Language/Version**: TypeScript strict (Next.js 15, App Router)

**Primary Dependencies**: Drizzle ORM, Zod, Next.js Server Actions, React (Server Components + Client Components)

**Storage**: PostgreSQL 16 (Neon) con RLS, tabla `promocion_content_blocks` existente

**Testing**: Vitest (unit + integration), Playwright (E2E — fuera de alcance en esta feature, F026)

**Target Platform**: Web (Vercel hosting)

**Project Type**: Web application (SaaS multi-tenant inmobiliario)

**Performance Goals**: Carga de bloques < 500ms, guardado < 1s

**Constraints**: Multi-tenant DNA (SET LOCAL), validación Zod cliente+servidor, constraint CHECK en BD

**Scale/Scope**: 5 tipos de bloque, ~10 tareas de implementación

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Scope Rule (§2) | ✅ PASS | Bloques editoriales van en `features/promociones/` (específico de feature). Schemas Zod ya existen en `shared/types/`. |
| TDD (§3) | ✅ PASS | Tests unitarios para repositorio y validación Zod antes de implementación. |
| Zod validation (§4) | ✅ PASS | Schemas Zod ya definidos en `shared/types/content-block-schema.ts`. Se usan en cliente y servidor. |
| Multi-tenant DNA (§2.1) | ✅ PASS | Todas las operaciones pasan por TenantAwareRepository con SET LOCAL. |
| No WYSIWYG libre (arch §1) | ✅ PASS | Solo bloques estructurados con Zod. Sin editor markdown. |
| Kind constraint (arch §7.6) | ✅ PASS | Constraint CHECK en BD + validación en servicio. |
| Constants centralizadas (§2) | ✅ PASS | CONTENT_BLOCK_TYPES ya en `shared/constants/db-enums.ts`. |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/012-editorial-blocks-editor/
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
│       └── components/
│           ├── blocks-editor.tsx          # Client component: block list + drag & drop
│           ├── block-form-descripcion.tsx # Form for DESCRIPCION_GENERAL
│           ├── block-form-calidades.tsx   # Form for MEMORIA_CALIDADES
│           ├── block-form-zonas.tsx       # Form for ZONAS_COMUNES
│           ├── block-form-ubicacion.tsx   # Form for UBICACION_SERVICIOS
│           └── block-form-plazos.tsx      # Form for PLAZOS_GARANTIAS
├── infrastructure/
│   └── db/
│       └── repositories/
│           └── promocion.repository.ts    # Add: upsertContentBlock, deleteContentBlock, reorderContentBlocks, findAllContentBlocks
├── shared/
│   └── types/
│       └── content-block-schema.ts        # Already exists — may need refinement
└── app/
    └── (auth)/panel/catalogo/[id]/
        └── page.tsx                       # Integrate blocks-editor section

migrations/
└── [new migration]                        # Add CHECK constraint for kind-based block restriction
```

**Structure Decision**: Single project (Next.js). Block editor components live in `features/promociones/components/` because they are specific to the catalog management feature. Repository methods extend the existing `PromocionRepository`.

## Complexity Tracking

> No violations to justify — all constitution gates pass.
