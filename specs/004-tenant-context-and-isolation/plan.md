# Implementation Plan: Tenant Context and Isolation

**Branch**: `feature/004-tenant-context-and-isolation` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-tenant-context-and-isolation/spec.md`

## Summary

Implement the three `TenantContext` subtypes (`PublicContext`, `AuthenticatedContext`, `ApiKeyContext`), a `TenantAwareRepository` base class that enforces `SET LOCAL app.current_tenant_id` within every transaction, middleware that resolves the correct context once per request, and a blocking `tests/isolation/` suite verifying zero cross-tenant data visibility. This feature is the architectural backbone of multi-tenancy: every future repository, endpoint, and service layer depends on it.

## Technical Context

**Language/Version**: TypeScript 5.x strict (`"strict": true`)
**Primary Dependencies**: Drizzle ORM (PostgreSQL 16), Next.js 15 App Router, Zod, Vitest, @testing-library
**Storage**: PostgreSQL 16 on Neon (PgBouncer transaction pooling, RLS active)
**Testing**: Vitest (unit + isolation), coverage ≥ 80% on tenant layer
**Target Platform**: Vercel (serverless functions + Edge middleware)
**Project Type**: web-service (Next.js full-stack)
**Performance Goals**: Context resolution < 5ms per request; transaction overhead negligible
**Constraints**: `SET LOCAL` (never bare `SET`) inside every transaction; no raw DB queries outside repositories; middleware resolves context once
**Scale/Scope**: 3 context types, 1 abstract base repository, 1-2 middleware modules, `tests/isolation/` suite

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Repository Pattern (§2) | ✅ PASS | `TenantAwareRepository` is the abstract base enforcing the pattern for all future domain repos |
| TDD (§3) — RED → GREEN → REFACTOR | ✅ PASS | Isolation tests written first (RED), implementation follows (GREEN) |
| Scope Rule (§2) | ✅ PASS | `src/infrastructure/tenant/` for context classes; `src/infrastructure/db/repositories/` for base repo; `tests/isolation/` for verification |
| TypeScript strict (§1) | ✅ PASS | No `any`, no `@ts-ignore` |
| Coverage ≥ 80% (§3) | ✅ PASS | Target 80%+ on `infrastructure/tenant/` and `TenantAwareRepository` |
| SET LOCAL rule (§2.2, architecture) | ✅ PASS | Enforced by repository base class; CI grep bans bare `SET ` |
| No raw queries outside repos (§9, architecture) | ✅ PASS | All DB access through `TenantAwareRepository.withTransaction()` |
| Security — no secrets in code (§5) | ✅ PASS | Tenant public ID from env var; API key hashing out of scope (F016) |
| Dependencies explicit (§11.2) | ✅ PASS | F004 declares F002 as dependency; mock auth/key for testing |

**Gate Result: ALL PASS** — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/004-tenant-context-and-isolation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (interface contracts)
├── tasks.md             # Phase 2 output (/speckit-tasks)
└── checklists/
    └── requirements.md  # Spec quality validation
```

### Source Code (repository root) — files this feature creates/modifies

```text
src/
├── infrastructure/
│   ├── tenant/
│   │   ├── TenantContext.ts          # Abstract base
│   │   ├── PublicContext.ts          # domio.com — no session
│   │   ├── AuthenticatedContext.ts   # panel.domio.com — Auth.js session
│   │   ├── ApiKeyContext.ts          # /api/v1/* — API key
│   │   └── context-middleware.ts     # Host-based resolution
│   └── db/
│       └── repositories/
│           └── TenantAwareRepository.ts  # Abstract base for all domain repos

tests/
├── isolation/
│   ├── setup.ts                      # Two synthetic tenants, seed fixtures
│   ├── tenant-isolation.test.ts      # Main cross-tenant visibility suite
│   └── context-resolution.test.ts    # Context type resolution tests
└── unit/
    └── tenant/
        ├── public-context.test.ts
        ├── authenticated-context.test.ts
        ├── api-key-context.test.ts
        └── tenant-aware-repository.test.ts
```

**Structure Decision**: All tenant infrastructure lives under `src/infrastructure/tenant/`. The base repository class lives alongside domain repos in `src/infrastructure/db/repositories/`. This follows the existing architecture (§5) and keeps the tenant concern isolated. No UI or frontend changes in this feature.

## Complexity Tracking

> No violations. All gates passed. The repository pattern and SET LOCAL enforcement are direct implementations of architecture.md §2, not workarounds.
