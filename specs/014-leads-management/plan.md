# Implementation Plan: Leads Management

**Branch**: `feature/014-leads-management` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar la bandeja de leads del backoffice con listado paginado, filtros, detalle con notas internas, máquina de estados con histórico inmutable, marcas de leído/no-leído por usuario, reasignación con reset de marcas, y exportación CSV con scope por rol.

## Technical Context

**Language/Version**: TypeScript strict (Next.js 15, App Router)
**Primary Dependencies**: Drizzle ORM, Zod, Next.js Server Actions, React
**Storage**: PostgreSQL 16 (Neon) con RLS, tablas `leads`, `lead_notes`, `lead_history`, `lead_read_marks`
**Testing**: Vitest (unit + integration)
**Performance Goals**: Listado con filtros < 500ms
**Constraints**: Multi-tenant DNA, RLS por agente, histórico inmutable

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Scope Rule (§2) | ✅ PASS | Components en `features/leads/`, repositorio en `infrastructure/db/repositories/` |
| TDD (§3) | ✅ PASS | Tests antes de implementación |
| Multi-tenant DNA (§2.1) | ✅ PASS | SET LOCAL en toda transacción |
| Enums cerrados (§11.1) | ✅ PASS | LeadStatus, LeadSource, LeadChannel desde shared/constants |
| Histórico inmutable (§11.4) | ✅ PASS | RLS solo INSERT+SELECT en lead_history |
| WCAG AA (§6) | ✅ PASS | Labels, aria-live para badge, focus-visible |

## Project Structure

```text
src/
├── features/
│   └── leads/
│       ├── components/
│       │   ├── leads-table.tsx          # Listado con filtros
│       │   ├── lead-detail.tsx          # Detalle + notas + histórico
│       │   └── lead-status-badge.tsx    # Badge de estado
│       └── actions/
│           └── leads.actions.ts         # Server actions
├── infrastructure/
│   └── db/
│       └── repositories/
│           └── lead.repository.ts       # LeadRepository context-aware
└── app/
    └── (auth)/panel/leads/
        ├── page.tsx                     # Bandeja
        └── [id]/
            └── page.tsx                 # Detalle

tests/
├── integration/
│   └── lead-operations.test.ts
└── unit/
    └── lead-validation.test.ts
```

## Complexity Tracking

> No violations — all gates pass.
