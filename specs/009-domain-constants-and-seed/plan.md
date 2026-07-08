# Implementation Plan: Domain Constants & Seed

**Branch**: `feature/009-domain-constants-and-seed` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-domain-constants-and-seed/spec.md`

## Summary

Centralizar todos los conjuntos cerrados del dominio inmobiliario como constantes TypeScript inmutables con labels de presentación en español, definir schemas Zod de dominio que referencian esas constantes, y crear un script de seed idempotente que pueble la BD de desarrollo con datos demo realistas (tenant, usuarios, 8 promociones, tipologías, unidades, bloques editoriales, leads y configuración de contacto). Las constantes de enums de BD ya existen en `db-enums.ts`; esta feature añade labels, configuración, schemas Zod, seed y tests.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Drizzle ORM, Zod v4, pg, bcrypt (para hash de contraseñas en seed), tsx (para ejecutar scripts)

**Storage**: PostgreSQL 16 en Neon (con PostGIS para coordenadas). El seed inserta en tablas existentes creadas por F002.

**Testing**: Vitest para tests unitarios de constantes y schemas. Coverage 80%.

**Target Platform**: Node.js >= 20 (scripts de seed), Next.js 15 (App Router) para consumo de constantes/schemas.

**Project Type**: Web application (SaaS multi-tenant inmobiliario) — esta feature es puramente de dominio/infraestructura, sin superficie visual.

**Performance Goals**: N/A (feature de constantes y seed, sin impacto en runtime de producción).

**Constraints**: Las constantes deben ser tree-shakeables. El seed debe ser idempotente y ejecutable en < 10 segundos.

**Scale/Scope**: ~15 conjuntos cerrados de constantes, ~7 mapas de labels, ~4 schemas Zod, 1 script de seed con ~30 registros demo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regla | Estado | Justificación |
|-------|--------|---------------|
| §2 Scope Rule | ✅ PASS | Constantes en `src/shared/constants/`, schemas en `src/shared/types/`, seed en `scripts/`. Todo en shared porque lo consumen múltiples features. |
| §3 TDD | ✅ PASS | Tests de constantes y schemas se escriben antes de la implementación (o conjuntamente). |
| §11.1 Constantes centralizadas | ✅ PASS | Los conjuntos cerrados viven en `shared/constants/` como fuente única. |
| §7 Variables de entorno | ✅ PASS | El seed usa `DATABASE_URL` (ya declarada en `.env.example`). |
| Architecture §2.1 Multi-tenant | ✅ PASS | Todo registro de dominio en el seed lleva `tenant_id` NOT NULL. |
| Architecture §7.7 Zod enums | ✅ PASS | Los schemas Zod usan `z.enum()` referenciando los arrays `as const`. |

**Gate result**: PASS — sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/009-domain-constants-and-seed/
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
src/
├── shared/
│   ├── constants/
│   │   ├── db-enums.ts          # YA EXISTE — enums de BD (no se modifica)
│   │   ├── domain-labels.ts     # NUEVO — mapas valor → etiqueta en español
│   │   └── domain-config.ts     # NUEVO — límites y configuración
│   └── types/
│       ├── promocion-schema.ts  # NUEVO — schema Zod de promoción
│       ├── tipologia-schema.ts  # NUEVO — schema Zod de tipología
│       ├── lead-schema.ts       # NUEVO — schema Zod de lead
│       └── content-block-schema.ts # NUEVO — schema Zod discriminado de bloques
scripts/
│   └── seed.ts                  # NUEVO — script de seed
tests/
└── unit/
    ├── constants.test.ts        # NUEVO — tests de inmutabilidad y exhaustividad
    └── schemas.test.ts          # NUEVO — tests de validación Zod
```

**Structure Decision**: Estructura de proyecto único (Next.js monorepo). Las constantes y schemas viven en `src/shared/` porque los consumen múltiples features (backoffice, catálogo público, API pública). El seed vive en `scripts/` porque es un script de CLI, no código de aplicación.

## Complexity Tracking

No violations to track. All constitution gates pass.
