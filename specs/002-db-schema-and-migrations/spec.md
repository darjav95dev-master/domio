# Feature Specification: DB Schema & Migrations

**Feature Branch**: `feature/002-db-schema-and-migrations`
**Created**: 2026-07-06
**Input**: Schema Drizzle completo con 19 tablas, RLS, PostGIS, índices y migraciones.

## User Scenarios

### US1 — Migración ejecutable (P1)
Un desarrollador ejecuta `pnpm db:migrate` y las 19+ tablas con RLS e índices se crean.

**Test**: `pnpm db:migrate` exitoso contra Neon.

### US2 — Tipos TypeScript (P1)
Tipos Drizzle compilan sin errores. `pnpm typecheck` limpio.

### US3 — Aislamiento RLS (P1)
Datos de tenant A invisibles para tenant B.

### US4 — Índices optimizados (P2)
Queries frecuentes usan index scans.

## Requirements (13 FRs)

- **FR-001/002**: `tenants`, `users` con FK, roles
- **FR-003**: `promociones` con PostGIS geometry, construction_status enum nullable, draft_payload JSONB
- **FR-004/005**: `tipologias` (amenities JSONB), `unidades`, `media_assets` (constraint UNIQUE parcial is_cover), `promocion_content_blocks`, `leads` (máquina estados), `lead_read_marks`, `lead_notes`, `lead_history`, `consent_records`, `arsop_requests`, `content_blocks`, `contact_config`, `content_history`, `email_queue` (sin tenant_id), `api_keys`
- **FR-006/007**: RLS en todas las tablas con tenant_id via `current_setting('app.current_tenant_id')`
- **FR-008-011**: Índices compuestos tenant_id-first, GIST en location, constraint portada única
- **FR-012/013**: Migraciones drizzle-kit, tipos exportados

## Success Criteria
- SC-001: `pnpm db:migrate` crea 19+ tablas
- SC-002: `pnpm typecheck` limpio
- SC-003: Tests RLS confirman aislamiento
- SC-004: Index scan en query catálogo
- SC-005: Constraint portada única rechaza duplicado
