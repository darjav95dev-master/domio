# Implementation Plan: Team and API Keys

**Branch**: `feature/016-team-and-api-keys` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Gestión de equipo (CRUD usuarios con invitación email y soft-delete) y API keys (crear con hash, revocar, rate limit) — solo ADMIN.

## Technical Context

**Language/Version**: TypeScript strict (Next.js 15)
**Primary Dependencies**: Drizzle ORM, Zod, bcrypt, email_queue
**Storage**: PostgreSQL 16 (Neon)
**Testing**: Vitest (unit + integration)

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Multi-tenant DNA (§2.1) | ✅ PASS | SET LOCAL en transacciones |
| TDD (§3) | ✅ PASS | Tests antes de implementación |
| Enums cerrados (§11.1) | ✅ PASS | UserRole desde shared/constants |
| Email encolado (§11.3) | ✅ PASS | email_queue, no Resend directo |
| Scope Rule (§2) | ✅ PASS | features/team/ y features/api-keys/ |

## Project Structure

```text
src/
├── features/
│   ├── team/
│   │   ├── components/     # UI gestión usuarios
│   │   └── actions/        # Server actions
│   └── api-keys/
│       ├── components/     # UI gestión keys
│       └── actions/        # Server actions
├── infrastructure/
│   └── db/repositories/
│       ├── user.repository.ts
│       └── api-key.repository.ts
└── shared/types/
    ├── user-schema.ts
    └── api-key-schema.ts
```

## Complexity Tracking

> No violations.
