# Implementation Plan: portafolio-catalogo

**Branch**: `feature/020-portafolio-catalogo` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Catálogo público SSR en `/portafolio` con filter bar sticky, grid responsive de PropertyCards, cursor pagination, y empty state compuesto. Consumir datos de `promociones` con `PublicContext` (garantiza `status='PUBLISHED'`).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Tailwind CSS v4, Zod

**Storage**: PostgreSQL (lectura de promociones con PublicContext)

**Testing**: Vitest (unit), Playwright (E2E en F026)

**Target Platform**: Web (Vercel hosting) — SSR

**Performance Goals**: Lighthouse Performance ≥80, Accessibility ≥90

**Constraints**: SSR obligatorio, cursor pagination (no offset), PublicContext garantiza PUBLISHED

## Constitution Check

**Scope Rule (§2)**: ✓
- Componentes de catálogo → `src/features/catalog/` (feature-specific)
- Nav, Footer → reutilizados de `src/shared/components/` (F018)

**SSR obligatorio (§1)**: ✓
- Catálogo renderizado SSR
- FilterBar es Client Component (necesita estado)

**Paginación por cursor (§7)**: ✓
- No offset, cursor codifica (sort_key, id)
- Método nuevo en PromocionRepository

**Accesibilidad (§6)**: ✓
- WCAG AA, Lighthouse ≥90
- aria-live, role="search", labels asociados

## Project Structure

```text
src/
└── features/
    └── catalog/
        ├── components/
        │   ├── FilterBar.tsx
        │   ├── PropertyCard.tsx
        │   ├── CatalogGrid.tsx
        │   └── EmptyState.tsx
        ├── hooks/
        │   └── useFilters.ts
        └── server/
            └── get-catalog-data.ts

app/
└── (public)/
    └── portafolio/
        └── page.tsx
```

## Complexity Tracking

> **No violations detected.**
