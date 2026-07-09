# Implementation Plan: Contract Tests

**Branch**: `feature/027-contract-tests` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-contract-tests/spec.md`

## Summary

Completar la suite de tests de contrato para la API pública v1 de Domio. Se implementará: (1) sistema de snapshots JSON versionados para schemas zod con test de no-divergencia bloqueante en CI; (2) generación automática de spec OpenAPI 3.0 desde schemas zod servido en `/api/internal/docs` (con autenticación); (3) contract tests de rate limiting. Los tests existentes en `tests/contract/v1/` (promocion-response.contract.spec.ts y lead-institutional.contract.spec.ts) se amplían con snapshot comparison y consumer mirror tests.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Vitest (test runner), zod (schema validation), `zod-to-openapi` o similar (generación OpenAPI), `@asteasolutions/zod-to-openapi` (alternativa madura)

**Storage**: N/A (tests no modifican BD; snapshots son archivos JSON en git)

**Testing**: Vitest (contract tests), Playwright (E2E — ya implementado en F026)

**Target Platform**: Node.js LTS (tests corren en CI y local)

**Project Type**: Web application (Next.js 15 App Router) con API pública REST

**Performance Goals**: Suite completa < 10 segundos; endpoint /api/internal/docs < 200ms

**Constraints**: Snapshots versionados en git; OpenAPI generation en runtime (no build time); tests bloqueantes en CI

**Scale/Scope**: 2 endpoints v1 (GET /promociones, POST /leads/institutional); 2 schemas zod principales; 1 endpoint interno de docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Tests de contrato en tests/contract/ (§3) | ✅ PASS | Directorio ya existe con 2 tests base |
| Schemas zod versionados (§3) | ✅ PASS | Schemas ya existen en src/features/api-public/schemas/ |
| Script test:contract en package.json (§3) | ✅ PASS | Ya existe: `vitest --run tests/contract` |
| Bloqueo de CI en divergencia (§3/§7.12) | ✅ PASS | Se implementará con snapshots y test de comparación |
| Scope Rule (§2) | ✅ PASS | Tests en tests/contract/, endpoint en app/api/internal/ |
| Sin hardcoded secrets (§5) | ✅ PASS | Endpoint /api/internal/docs usa getServerSession() |
| OpenAPI como documentación interna | ✅ PASS | No expuesto públicamente, requiere auth |

## Project Structure

### Documentation (this feature)

```text
specs/027-contract-tests/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
tests/contract/v1/
├── promocion-response.contract.spec.ts       # Existing — amplified with snapshot comparison
├── lead-institutional.contract.spec.ts       # Existing — amplified with snapshot comparison
├── rate-limit.contract.spec.ts               # New — rate limiting contract tests
├── consumer-mirror.contract.spec.ts          # New — consumer perspective tests
└── snapshots/
    ├── promocion-response.schema.json        # New — snapshot of promocionResponseSchema
    └── lead-institutional.schema.json        # New — snapshot of leadInstitutionalSchema

src/features/api-public/
├── schemas/
│   ├── promocion-response.schema.ts          # Existing — no changes
│   └── lead-institutional.schema.ts          # Existing — no changes
├── serializers/
│   └── promocion-serializer.ts               # Existing — no changes
└── openapi/
    └── generate-openapi.ts                   # New — OpenAPI spec generator

app/api/internal/docs/
└── route.ts                                  # New — serves OpenAPI spec (auth required)

scripts/
└── update-contract-snapshots.ts              # New — helper to update snapshots manually
```

**Structure Decision**: Tests de contrato amplían el directorio existente `tests/contract/v1/`. Snapshots en subdirectorio `snapshots/` para separación clara. Endpoint OpenAPI en `app/api/internal/docs/` siguiendo el patrón de rutas internas. Generador OpenAPI en `src/features/api-public/openapi/` (scope de feature api-public).

## Complexity Tracking

No violations. All constitution gates pass.
