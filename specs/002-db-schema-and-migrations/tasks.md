# Tasks: DB Schema & Migrations

**Feature**: F002 | **Branch**: feature/002-db-schema-and-migrations

## Phase 1: Setup
- [ ] T001 Instalar drizzle-orm, drizzle-kit, drizzle-zod, pg, @types/pg
- [ ] T002 Crear `src/infrastructure/db/drizzle.config.ts`
- [ ] T003 Crear `src/infrastructure/db/schema/index.ts` barrel
- [ ] T004 Scripts: `db:generate`, `db:migrate`, `db:studio`, `db:push`

## Phase 2: Core (tenants, users)
- [ ] T005 [P] `schema/tenants.ts`: id uuid PK, name, slug unique, config JSONB, timestamps
- [ ] T006 [P] `schema/users.ts`: id uuid PK, tenant_id FK, email, role enum, timestamps

## Phase 3: Inmuebles (promociones, tipologias, unidades, media, blocks)
- [ ] T007 [P] `schema/promociones.ts`: location geometry(Point,4326), construction_status enum nullable, draft_payload JSONB, kind enum, status enum
- [ ] T008 [P] `schema/tipologias.ts`: amenities JSONB, plan_asset_id FK
- [ ] T009 [P] `schema/unidades.ts`: status enum AVAILABLE/RESERVED/SOLD
- [ ] T010 [P] `schema/media-assets.ts`: UNIQUE parcial (promocion_id, is_cover) WHERE is_cover=true
- [ ] T011 [P] `schema/promocion-content-blocks.ts`: block_type, config JSONB

## Phase 4: Leads & compliance
- [ ] T012-T017 [P] leads, read_marks, notes, history, consent, arsop — todas con tenant_id FK

## Phase 5: Infrastructure
- [ ] T018-T022 [P] content_blocks, contact_config, content_history, email_queue (sin tenant_id), api_keys

## Phase 6: RLS + Índices + Migraciones
- [ ] T023 RLS en todas las tablas con tenant_id
- [ ] T024 Índices compuestos tenant_id-first
- [ ] T025 Índice GIST location + (tenant_id, construction_status)
- [ ] T026 `pnpm db:generate`
- [ ] T027 `pnpm db:migrate`

## Phase 7: Tests
- [ ] T028 [P] `tests/isolation/rls-isolation.test.ts` (TDD: RED primero)
- [ ] T029 [P] Test constraint portada única
- [ ] T030-T032 typecheck, lint, test:run
