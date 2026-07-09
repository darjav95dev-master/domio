# Tasks: seo-sitemap-meta

**Input**: Design documents from `/specs/025-seo-sitemap-meta/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit tests included for pure functions (SEO fallback, structured data builders, sitemap URL generation). TDD approach per constitution §3.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment configuration and shared SEO utilities

- [x] T001 Add `NEXT_PUBLIC_SITE_URL` to `.env.example` with documentation comment
- [x] T002 [P] Create `src/shared/utils/seo/site-url.ts` — helper that reads `NEXT_PUBLIC_SITE_URL` with fallback to `http://localhost:3000`
- [x] T003 [P] Create `src/shared/utils/seo/constants.ts` — sitemap change frequencies, default metadata values
- [x] T004 [P] Create `src/shared/utils/seo/default-og-image.ts` — helper to resolve default OG image URL from tenant config
- [x] T005 Create directory structure: `src/features/seo/server/`

**Checkpoint**: Shared SEO infrastructure ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core SEO utilities that all user stories depend on

- [x] T006 Write unit tests for `getSiteUrl()` in `src/shared/utils/seo/__tests__/site-url.spec.ts`
- [x] T007 Implement `getSiteUrl()` in `src/shared/utils/seo/site-url.ts` (tests from T006 must pass)
- [x] T008 Ensure seed data populates `tenants.config` with `{ logo, phone, email, address, defaultOgImage }` — update seed script in `src/infrastructure/db/seed.ts`

**Checkpoint**: Foundation ready — site URL helper tested, tenant config populated

---

## Phase 3: User Story 1 — Sitemap XML autogenerado (Priority: P1) 🎯 MVP

**Goal**: Dynamic sitemap.xml with all PUBLISHED promotions, home, portafolio, contacto, sobre

**Independent Test**: `curl http://localhost:3000/sitemap.xml` returns valid XML with correct URLs, lastmod, changefreq

### Tests for User Story 1

- [x] T009 [P] [US1] Write unit tests for sitemap URL builder in `src/features/seo/server/__tests__/sitemap-urls.spec.ts`

### Implementation for User Story 1

- [x] T010 [US1] Implement `buildSitemapUrls()` in `src/features/seo/server/sitemap-urls.ts` — queries published promotions via PublicContext, builds URL entries with lastmod and changefreq
- [x] T011 [US1] Create `app/sitemap.ts` — exports `MetadataRoute.Sitemap` using `buildSitemapUrls()`, includes static pages (home, portafolio, contacto, sobre) with appropriate changefreq

**Checkpoint**: Sitemap XML accessible and valid

---

## Phase 4: User Story 2 — Robots.txt diferenciado (Priority: P1)

**Goal**: Refined robots.txt allowing public indexing, blocking backoffice and API, with Sitemap directive

**Independent Test**: `curl http://localhost:3000/robots.txt` returns correct text with Sitemap directive

### Implementation for User Story 2

- [x] T012 [US2] Update `app/robots.ts` — add `Sitemap:` directive using `getSiteUrl()`, add `Disallow: /api`, add `host` directive, ensure `/panel` and `/api` are blocked

**Checkpoint**: Robots.txt correct with Sitemap reference

---

## Phase 5: User Story 3 — Metadata API con Open Graph y Twitter Cards (Priority: P1)

**Goal**: Every public page has unique metadata with OG, Twitter Cards, and canonical URLs

**Independent Test**: Inspect HTML of each public page — verify og:title, twitter:card, canonical link present and correct

### Tests for User Story 3

- [x] T013 [P] [US3] Write unit tests for metadata builder helpers in `src/features/seo/server/__tests__/metadata-builders.spec.ts`

### Implementation for User Story 3

- [x] T014 [P] [US3] Create `src/features/seo/server/build-page-metadata.ts` — helper that builds standard Metadata object with OG, Twitter, canonical from inputs
- [x] T015 [US3] Add `generateMetadata` to `app/(public)/page.tsx` (home) — title, description, OG (type=website), Twitter, canonical
- [x] T016 [US3] Update `app/(public)/portafolio/page.tsx` — replace static metadata with `generateMetadata` including OG images, Twitter, canonical
- [x] T017 [US3] Update `app/(public)/inmuebles/[slug]/page.tsx` — fix canonical to use `getSiteUrl()` instead of hardcoded domain, ensure OG image from cover or default
- [x] T018 [P] [US3] Add `generateMetadata` to `app/(public)/contacto/page.tsx` — OG, Twitter, canonical
- [x] T019 [P] [US3] Add `generateMetadata` to `app/(public)/sobre/page.tsx` — OG, Twitter, canonical

**Checkpoint**: All public pages have unique metadata with OG, Twitter, canonical

---

## Phase 6: User Story 4 — Datos estructurados Organization y BreadcrumbList (Priority: P2)

**Goal**: Organization JSON-LD on home, BreadcrumbList JSON-LD on detail pages

**Independent Test**: Inspect HTML — verify `<script type="application/ld+json">` with Organization on home, BreadcrumbList on detail pages

### Tests for User Story 4

- [x] T020 [P] [US4] Write unit tests for Organization JSON-LD builder in `src/features/seo/server/__tests__/organization-json-ld.spec.ts`
- [x] T021 [P] [US4] Write unit tests for BreadcrumbList JSON-LD builder in `src/features/seo/server/__tests__/breadcrumb-json-ld.spec.ts`

### Implementation for User Story 4

- [x] T022 [US4] Implement `buildOrganizationJsonLd()` in `src/features/seo/server/organization-json-ld.ts` — reads tenant config + contact_config, returns Organization schema.org object
- [x] T023 [US4] Implement `buildBreadcrumbJsonLd()` in `src/features/seo/server/breadcrumb-json-ld.ts` — takes promotion name and slug, returns BreadcrumbList with 3 items (Home → Portafolio → Promotion)
- [x] T024 [US4] Inject Organization JSON-LD in `app/(public)/page.tsx` (home) — `<script type="application/ld+json">` in page component
- [x] T025 [US4] Inject BreadcrumbList JSON-LD in `app/(public)/inmuebles/[slug]/page.tsx` — alongside existing RealEstateListing, without modifying it

**Checkpoint**: Organization and BreadcrumbList JSON-LD present and valid

---

## Phase 7: User Story 5 — Lighthouse audit (Priority: P2)

**Goal**: Verify and fix Performance ≥ 80 and Accessibility ≥ 90 on home, portafolio, and 3+ detail pages

**Independent Test**: Run Lighthouse CLI on each page, verify thresholds met

### Implementation for User Story 5

- [x] T026 [US5] Run Lighthouse on `http://localhost:3000` (home) — document scores, identify issues
- [x] T027 [US5] Run Lighthouse on `http://localhost:3000/portafolio` — document scores, identify issues
- [x] T028 [US5] Run Lighthouse on 3+ detail pages (`http://localhost:3000/inmuebles/{slug}`) — document scores, identify issues
- [x] T029 [US5] Fix Lighthouse issues found — image optimization, missing alt text, contrast ratios, render-blocking resources, etc.
- [x] T030 [US5] Re-run Lighthouse to verify all thresholds met (Performance ≥ 80, Accessibility ≥ 90)

**Checkpoint**: All pages meet Lighthouse thresholds

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T031 Update `.env.example` with `NEXT_PUBLIC_SITE_URL` documentation
- [x] T032 Run quickstart.md validation steps end-to-end
- [x] T033 Verify sitemap.xml with XML validator
- [x] T034 Verify JSON-LD with Google Rich Results Test (manual)
- [x] T035 Code cleanup — remove any TODO comments, ensure consistent error handling

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 Sitemap (Phase 3)**: Depends on Foundational — can start after Phase 2
- **US2 Robots (Phase 4)**: Depends on Foundational — can start after Phase 2, parallel with US1
- **US3 Metadata (Phase 5)**: Depends on Foundational — can start after Phase 2, parallel with US1/US2
- **US4 Structured Data (Phase 6)**: Depends on Foundational — can start after Phase 2, parallel with US1/US2/US3
- **US5 Lighthouse (Phase 7)**: Depends on US3 and US4 (needs metadata and JSON-LD in place)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Sitemap)**: Independent after Foundational
- **US2 (Robots)**: Independent after Foundational
- **US3 (Metadata)**: Independent after Foundational
- **US4 (Structured Data)**: Independent after Foundational
- **US5 (Lighthouse)**: Depends on US3 + US4 (validates their output)

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different files)
- T009, T013, T020, T021 can run in parallel (test files)
- T015, T016, T017, T018, T019 can partially parallelize (different page files)
- US1, US2, US3, US4 can be worked on in parallel after Foundational

---

## Parallel Example: User Story 3

```bash
# Launch all page metadata tasks together:
Task: "Add generateMetadata to home page.tsx"
Task: "Update portafolio page.tsx with generateMetadata"
Task: "Update detail page.tsx canonical URL"
Task: "Add generateMetadata to contacto page.tsx"
Task: "Add generateMetadata to sobre page.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Sitemap)
4. Complete Phase 4: US2 (Robots)
5. Complete Phase 5: US3 (Metadata)
6. **STOP and VALIDATE**: Sitemap, robots, and metadata all working
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Sitemap) → Validate independently
3. US2 (Robots) → Validate independently
4. US3 (Metadata) → Validate independently
5. US4 (Structured Data) → Validate independently
6. US5 (Lighthouse) → Final validation
7. Each story adds SEO value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- TDD: Write tests first for pure functions (T006-T007, T009-T010, T013-T014, T020-T022, T021-T023)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All SEO is server-side (no client-side rendering for SEO content)
