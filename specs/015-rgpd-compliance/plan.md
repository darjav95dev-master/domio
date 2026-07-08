# Implementation Plan: RGPD Compliance

**Branch**: `feature/015-rgpd-compliance` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar registro de consentimiento RGPD en la creación de leads, ejercicio de derechos ARSOP (export CSV + borrado en cascada) desde el backoffice, y trazabilidad completa en arsop_requests con inmutabilidad garantizada por RLS.

## Technical Context

**Language/Version**: TypeScript strict (Next.js 15)
**Primary Dependencies**: Drizzle ORM, Zod, MediaService (R2)
**Storage**: PostgreSQL 16 (Neon), Cloudflare R2
**Testing**: Vitest (unit + integration)
**Constraints**: Multi-tenant DNA, inmutabilidad RLS, transacciones atómicas

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Multi-tenant DNA (§2.1) | ✅ PASS | SET LOCAL en toda transacción |
| TDD (§3) | ✅ PASS | Tests antes de implementación |
| Inmutabilidad (§11.4) | ✅ PASS | consent_records y arsop_requests solo INSERT+SELECT |
| Zod validation (§4) | ✅ PASS | Validación consentimiento en cliente+servidor |
| Scope Rule (§2) | ✅ PASS | ARSOP en features/leads/actions/ |

## Project Structure

```text
src/
├── features/
│   └── leads/
│       ├── actions/
│       │   └── arsop.actions.ts       # Export + Delete server actions
│       └── components/
│           └── arsop-buttons.tsx       # UI export/delete (ADMIN only)
├── infrastructure/
│   └── db/
│       └── repositories/
│           ├── consent.repository.ts   # ConsentRecord operations
│           └── arsop.repository.ts     # ARSOP operations + cascade delete
└── shared/
    └── types/
        └── consent-schema.ts           # Zod schemas

tests/
├── integration/
│   ├── consent-operations.test.ts
│   └── arsop-operations.test.ts
└── unit/
    └── consent-validation.test.ts
```

## Complexity Tracking

> No violations.
