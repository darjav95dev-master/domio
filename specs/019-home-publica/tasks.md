# Tasks: home-publica

**Input**: Design documents from `/specs/019-home-publica/`

**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: TDD approach — tests para componentes UI con @testing-library/react.

**Organization**: Tasks grouped by component, all UI (frontend-developer).

## Phase 1: Setup

- [ ] T001 Create feature directory structure: `src/features/home/components/`, `src/features/home/hooks/`

---

## Phase 2: Hero Block (P1)

**Goal**: Hero full-bleed 100vh con overlay multicapa, grid 1.4fr 1fr, TrustCard, trust-marquee.

- [ ] T002 [US1] Create Hero component in src/features/home/components/Hero.tsx — full-bleed 100vh, overlay multicapa, grid 1.4fr 1fr (copy + TrustCard), trust-marquee band, consume content_blocks with page_key='home' and block_key='hero'
- [ ] T003 [US1] Write tests for Hero in tests/features/home/Hero.test.tsx

---

## Phase 3: HowWeWork Block (P1)

**Goal**: Grid 4-col con gap 1px, numeral italic 52px + icono + título + cuerpo.

- [ ] T004 [US1] Create HowWeWork component in src/features/home/components/HowWeWork.tsx — grid 4-col, gap 1px, numeral italic 52px, consume content_blocks with block_key='como-trabajamos'
- [ ] T005 [US1] Write tests for HowWeWork in tests/features/home/HowWeWork.test.tsx

---

## Phase 4: AboutDomio Block (P1)

**Goal**: Split 1fr 1.05fr con fotografía + tabla comparativa.

- [ ] T006 [US1] Create AboutDomio component in src/features/home/components/AboutDomio.tsx — split 1fr 1.05fr, fotografía arquitectónica, tabla comparativa, consume content_blocks with block_key='sobre'
- [ ] T007 [US1] Write tests for AboutDomio in tests/features/home/AboutDomio.test.tsx

---

## Phase 5: FeaturedPortfolio Block (P1)

**Goal**: Grid 1.3fr 1fr 1fr con 3 PropertyCards (1 featured span 2).

- [ ] T008 [US1] Create FeaturedPortfolio component in src/features/home/components/FeaturedPortfolio.tsx — grid 1.3fr 1fr 1fr, 3 PropertyCards (1 featured span 2), query promociones with kind='portfolio' and status='PUBLISHED' using PublicContext
- [ ] T009 [US1] Write tests for FeaturedPortfolio in tests/features/home/FeaturedPortfolio.test.tsx

---

## Phase 6: Trust Block (P1)

**Goal**: Fondo bone, métricas 4-col, testimonios 3-col.

- [ ] T010 [US1] Create Trust component in src/features/home/components/Trust.tsx — fondo bone, métricas 4-col numeral hero 72px, testimonios 3-col, consume content_blocks with block_key='confianza'
- [ ] T011 [US1] Write tests for Trust in tests/features/home/Trust.test.tsx

---

## Phase 7: CTA Block (P1)

**Goal**: Full-bleed con fotografía, H2 display-lg, botón primary.

- [ ] T012 [US1] Create CTA component in src/features/home/components/CTA.tsx — full-bleed con fotografía, H2 display-lg, botón primary, consume content_blocks with block_key='cta-final'
- [ ] T013 [US1] Write tests for CTA in tests/features/home/CTA.test.tsx

---

## Phase 8: FAQ Block (P1)

**Goal**: Grid 1fr 1.2fr con 6-8 preguntas accordion.

- [ ] T014 [US1] Create FAQ component in src/features/home/components/FAQ.tsx — grid 1fr 1.2fr, 6-8 preguntas accordion animado, consume content_blocks with block_key='faq'
- [ ] T015 [US1] Write tests for FAQ in tests/features/home/FAQ.test.tsx

---

## Phase 9: Scroll-reveal Hook (P2)

**Goal**: Hook para scroll-reveal con stagger 80ms, respeta prefers-reduced-motion.

- [ ] T016 [US2] Create useScrollReveal hook in src/features/home/hooks/useScrollReveal.ts — IntersectionObserver, stagger 80ms, prefers-reduced-motion
- [ ] T017 [US2] Write tests for useScrollReveal in tests/features/home/useScrollReveal.test.ts

---

## Phase 10: Home Page Integration

**Goal**: Orquestar los 9 bloques en page.tsx.

- [ ] T018 [US1] [US2] Create/update home page in app/(public)/page.tsx — orquesta los 9 bloques en orden vertical, consume content_blocks y promociones, aplica scroll-reveal
- [ ] T019 [US1] [US2] Write tests for home page in tests/app/home-page.test.tsx

---

## Phase 11: Polish & Accessibility

- [ ] T020 Verify Lighthouse Performance ≥80 y Accessibility ≥90
- [ ] T021 Verify prefers-reduced-motion respected en toda animación
- [ ] T022 Code cleanup and consistency check

---

## Summary

- **Total tasks**: 22
- **All UI (frontend-developer)**: 22 tasks
- **No backend tasks** (no data model changes, no API, solo lectura de datos existentes)

**MVP scope**: Phase 1-10 = 19 tasks
