# Tasks: portafolio-catalogo

**Input**: Design documents from `/specs/020-portafolio-catalogo/`

**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: TDD approach — tests para componentes UI y lógica de filtros.

**Organization**: Tasks grouped by component, mix of backend (cursor pagination) and UI (frontend-developer).

## Phase 1: Backend - Cursor Pagination (P1)

**Goal**: Añadir método `findPublicWithCursor` a PromocionRepository que opere con PublicContext y devuelva cursor.

- [ ] T001 Add findPublicWithCursor method to PromocionRepository in src/features/promociones/server/promocion.repository.ts — cursor pagination con PublicContext, codifica (sort_key, id)
- [ ] T002 Write tests for findPublicWithCursor in tests/features/promociones/promocion.repository.cursor.test.ts

---

## Phase 2: Catalog Data Fetcher (P1)

**Goal**: Server function que consulta promociones con filtros y cursor.

- [ ] T003 Create getCatalogData in src/features/catalog/server/get-catalog-data.ts — acepta filtros y cursor, retorna { items, nextCursor, total }
- [ ] T004 Write tests for getCatalogData in tests/features/catalog/get-catalog-data.test.ts

---

## Phase 3: PropertyCard Component (P1)

**Goal**: PropertyCard para catálogo (diferente al de la home).

- [ ] T005 Create PropertyCard component in src/features/catalog/components/PropertyCard.tsx — article con imagen, título, precio, ubicación, badges, enlace a ficha
- [ ] T006 Write tests for PropertyCard in tests/features/catalog/PropertyCard.test.tsx

---

## Phase 4: FilterBar Component (P1)

**Goal**: Filter bar sticky con controles para todos los filtros.

- [ ] T007 Create FilterBar component in src/features/catalog/components/FilterBar.tsx — form role="search", sticky-top, controles para isla, municipio, tipo, operación, precio, dormitorios, baños, amenities, estado de obra
- [ ] T008 Create useFilters hook in src/features/catalog/hooks/useFilters.ts — maneja estado de filtros, actualiza URL con searchParams
- [ ] T009 Write tests for FilterBar y useFilters en tests/features/catalog/FilterBar.test.tsx

---

## Phase 5: CatalogGrid Component (P1)

**Goal**: Grid responsive de PropertyCards con paginación.

- [ ] T010 Create CatalogGrid component in src/features/catalog/components/CatalogGrid.tsx — grid 3→2→1 col, cursor pagination, result count con aria-live
- [ ] T011 Write tests for CatalogGrid in tests/features/catalog/CatalogGrid.test.tsx

---

## Phase 6: EmptyState Component (P1)

**Goal**: Empty state compuesto al no haber resultados.

- [ ] T012 Create EmptyState component in src/features/catalog/components/EmptyState.tsx — eyebrow + heading-sm Fraunces + body-sm + botón "Ver todo el portafolio"
- [ ] T013 Write tests for EmptyState in tests/features/catalog/EmptyState.test.tsx

---

## Phase 7: Catalog Page Integration (P1)

**Goal**: Orquestar todos los componentes en page.tsx.

- [ ] T014 Create/update portafolio page in app/(public)/portafolio/page.tsx — SSR Server Component, orquesta FilterBar, CatalogGrid, EmptyState, consume getCatalogData
- [ ] T015 Write tests for portafolio page in tests/app/portafolio-page.test.tsx

---

## Phase 8: Polish & Accessibility

- [ ] T016 Verify Lighthouse Performance ≥80 y Accessibility ≥90
- [ ] T017 Verify cursor pagination funciona sin duplicados
- [ ] T018 Code cleanup and consistency check

---

## Summary

- **Total tasks**: 18
- **Backend (backend-developer)**: 4 tasks (T001-T004)
- **UI (frontend-developer)**: 14 tasks (T005-T018)

**MVP scope**: Phase 1-7 = 15 tasks
