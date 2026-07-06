# Implementation Plan: DB Schema & Migrations

**Branch**: `feature/002-db-schema-and-migrations` | **Spec**: [spec.md](./spec.md)

## Technical Context
**Stack**: Drizzle ORM, PostgreSQL 15+ (Neon), PostGIS, drizzle-kit, drizzle-zod
**Testing**: Vitest con tests de aislamiento RLS

## Constitution Check
| § | Status |
|---|--------|
| §3 TDD | ✅ Tests RLS antes de políticas |
| §6 Multi-tenant | ✅ RLS en todas las tablas dominio |

## Source Structure
```
src/infrastructure/db/
├── schema/          # 19 archivos de tabla + index.ts barrel
├── migrations/      # drizzle-kit generated
└── drizzle.config.ts
tests/isolation/rls-isolation.test.ts
```
