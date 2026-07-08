# Tasks: public-shared-chrome

**Input**: Design documents from `/specs/018-public-shared-chrome/`

**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: TDD approach — tests para componentes UI con @testing-library/react.

**Organization**: Tasks grouped by component, all UI (frontend-developer).

## Phase 1: Setup

- [ ] T001 Verify Nav, Footer, SkipToContent components don't exist yet in src/shared/components/

---

## Phase 2: SkipToContent Component (P2)

**Goal**: Enlace "Skip to content" accesible que mueve el foco al `<main>`.

- [ ] T002 [US3] Create SkipToContent component in src/shared/components/SkipToContent.tsx — enlace visible solo al foco, mueve foco al `<main id="main-content">`
- [ ] T003 [US3] Write tests for SkipToContent in src/shared/components/__tests__/SkipToContent.test.tsx — visibilidad al foco, movimiento de foco

---

## Phase 3: Footer Component (P1)

**Goal**: Footer slate con 4 columnas, tagline editorial, fila legal.

- [ ] T004 [US2] Create Footer component in src/shared/components/Footer.tsx — fondo slate, grid 4-col, tagline Fraunces italic, enlaces estáticos, fila legal
- [ ] T005 [US2] Write tests for Footer in src/shared/components/__tests__/Footer.test.tsx — renderizado de columnas, tagline, fila legal, responsive

---

## Phase 4: Nav Component (P1)

**Goal**: Nav fijo con transición over-hero/glass, logo, enlaces, CTA, hamburguesa móvil.

- [ ] T006 [US1] Create Nav component in src/shared/components/Nav.tsx — fijo z-100, modo over-hero/glass, logo Fraunces italic, enlaces con animación, CTA pill, hamburguesa móvil con drawer
- [ ] T007 [US1] Write tests for Nav in src/shared/components/__tests__/Nav.test.tsx — modos over-hero/glass, transición al scroll, responsive, accesibilidad

---

## Phase 5: Public Layout Integration

**Goal**: Orquestar Nav, SkipToContent, main, Footer en layout.tsx.

- [ ] T008 [US1] [US2] [US3] Create/update public layout in app/(public)/layout.tsx — orquesta SkipToContent, Nav, `<main id="main-content">`, Footer
- [ ] T009 [US1] [US2] [US3] Write tests for public layout in app/(public)/__tests__/layout.test.tsx — estructura semántica, orden de componentes

---

## Phase 6: Polish & Accessibility

- [ ] T010 Verify Lighthouse Accessibility ≥90 en layout base
- [ ] T011 Verify prefers-reduced-motion respected en Nav transitions
- [ ] T012 Code cleanup and consistency check

---

## Summary

- **Total tasks**: 12
- **All UI (frontend-developer)**: 12 tasks
- **No backend tasks** (no data model, no API, no business logic)

**MVP scope**: Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 = 9 tasks
