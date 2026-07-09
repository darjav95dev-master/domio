# Tasks: E2E Tests

**Input**: Design documents from `/specs/026-e2e-tests/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: This feature IS testing — all tasks produce test code (Page Objects + spec files).

**Organization**: Tasks are grouped by user story (journey) to enable independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure and base classes for E2E test infrastructure

- [ ] T001 Create directory structure: `tests/e2e/pages/`, `tests/e2e/fixtures/`
- [ ] T002 Create `tests/e2e/pages/BasePage.ts` — abstract base class with common navigation (`goto(path)`), wait helpers (`waitForLoad()`), and page title assertion
- [ ] T003 Create `tests/e2e/fixtures/db-reset.ts` — helper that executes TRUNCATE CASCADE on mutable domain tables and re-inserts seed base data (promociones PUBLISHED, tipologías, unidades, content_blocks, contact_config, leads demo) before each suite

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth helper and shared utilities that ALL user story specs depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create `tests/e2e/fixtures/auth.ts` — login helper that uses LoginPage POM to authenticate with given credentials (email + password), waits for redirect to dashboard, exports `login(page, email, password)` function
- [ ] T005 [P] Create `tests/e2e/pages/LoginPage.ts` — Page Object for `/panel/login` with selectors: email input (`getByRole('textbox', { name: /email/i })`), password input (`getByRole('textbox', { name: /contraseña/i })`), submit button (`getByRole('button', { name: /iniciar sesión/i })`), error message container
- [ ] T006 [P] Create `tests/e2e/pages/HomePage.ts` — Page Object for `/` with selectors: hero heading, trust card numerals, featured portfolio cards, CTA buttons, FAQ accordion, footer contact data
- [ ] T007 [P] Create `tests/e2e/pages/PortafolioPage.ts` — Page Object for `/portafolio` with selectors: filter bar (isla, tipo, operación, precio, dormitorios, construction_status), result count, PropertyCard grid, pagination, empty state, active filter chips
- [ ] T008 [P] Create `tests/e2e/pages/InmuebleDetailPage.ts` — Page Object for `/inmuebles/[slug]` with selectors: photo hero, address line, badges (LIVE/HOT), infobar 4-col, editorial blocks, tipologías table, map container, contact form, WhatsApp button
- [ ] T009 [P] Create `tests/e2e/pages/ContactoPage.ts` — Page Object for `/contacto` with selectors: header (eyebrow + H1), quick-band 4-col, contact form, map container
- [ ] T010 [P] Create `tests/e2e/pages/DashboardPage.ts` — Page Object for `/panel` with selectors: unread leads badge (counter), latest promotions list, quick action links
- [ ] T011 [P] Create `tests/e2e/pages/CatalogoPage.ts` — Page Object for `/panel/catalogo` with selectors: filter bar, promotion list, status badges, construction_status indicators
- [ ] T012 [P] Create `tests/e2e/pages/CatalogoEditPage.ts` — Page Object for `/panel/catalogo/[id]` with selectors: form sections (identidad, estado comercial, ubicación, SEO, agente), construction_status select, publish button, autosave indicator, image upload area
- [ ] T013 [P] Create `tests/e2e/pages/LeadsPage.ts` — Page Object for `/panel/leads` with selectors: filter bar, lead list, status badges, unread indicators
- [ ] T014 [P] Create `tests/e2e/pages/LeadDetailPage.ts` — Page Object for `/panel/leads/[id]` with selectors: current status, state transition buttons, notes section, history timeline
- [ ] T015 [P] Create `tests/e2e/pages/EquipoPage.ts` — Page Object for `/panel/equipo` with selectors: user list, create button, role select, status indicators
- [ ] T016 [P] Create `tests/e2e/pages/ApiKeysPage.ts` — Page Object for `/panel/api-keys` with selectors: key list, create button, key value display (one-time), revoke button
- [ ] T017 [P] Create `tests/e2e/pages/ArsopPage.ts` — Page Object for `/panel/arsop` with selectors: request list, export button, delete button, confirmation dialog
- [ ] T018 [P] Create `tests/e2e/pages/ContenidosContactoPage.ts` — Page Object for `/panel/contenidos/contacto` with selectors: phone input, email input, address input, schedule input, WhatsApp number input, WhatsApp message input, save button
- [ ] T019 [P] Create `tests/e2e/pages/SobrePage.ts` — Page Object for `/sobre` with selectors: editorial content blocks, photography

**Checkpoint**: Foundation ready — all Page Objects and helpers created, user story specs can now be written

---

## Phase 3: User Story 1 — Visitante público (Priority: P1) 🎯 MVP

**Goal**: Verify that an anonymous visitor can navigate home → portafolio (with filters) → ficha detalle → submit contact form with RGPD consent → see confirmation

**Independent Test**: `pnpm test:e2e -- tests/e2e/visitor.spec.ts` passes

### Implementation for User Story 1

- [ ] T020 [US1] Create `tests/e2e/visitor.spec.ts` — full visitor journey spec:
  1. Navigate to `/` — verify hero, trust card, featured portfolio, FAQ, footer render with real data
  2. Navigate to `/portafolio` — apply filters (isla=Tenerife, operación=SALE), verify URL updates, verify grid shows matching results, verify result count
  3. Click first PropertyCard — verify detail page loads with gallery, infobar, editorial blocks, tipologías table, map
  4. Fill contact form (nombre, email, teléfono, mensaje) — accept RGPD consent checkbox — submit — verify confirmation message "Solicitud recibida"
  5. Verify lead was created (optional: login as agent and check bandeja, or verify via DB query)

**Checkpoint**: Visitor journey passes independently

---

## Phase 4: User Story 2 — Editor de catálogo (Priority: P2)

**Goal**: Verify that an OPERATOR can login, edit a promotion (change construction_status, upload images with alt_text), verify autosave, publish, and see changes on public detail page

**Independent Test**: `pnpm test:e2e -- tests/e2e/catalog-editor.spec.ts` passes

### Implementation for User Story 2

- [ ] T021 [US2] Create `tests/e2e/catalog-editor.spec.ts` — full catalog editor journey spec:
  1. Login as operador1@domio.dev / Domio2026! — verify redirect to dashboard with name visible
  2. Navigate to `/panel/catalogo` — verify promotion list loads with filters
  3. Click on a promotion — verify edit form loads with all sections
  4. Change construction_status (e.g., ON_PLAN → IN_CONSTRUCTION) — wait 30s for autosave — refresh page — verify change persisted
  5. Publish the promotion — navigate to public detail page — verify construction_status change is visible
  6. (If media upload is testable without real R2) Verify image upload UI with alt_text field

**Checkpoint**: Catalog editor journey passes independently

---

## Phase 5: User Story 3 — Agente comercial (Priority: P2)

**Goal**: Verify that an AGENT can login, see unread leads badge, open a lead (marks as read, badge decrements), change state (NEW → CONTACTED → WON), add note, and verify RLS isolation

**Independent Test**: `pnpm test:e2e -- tests/e2e/sales-agent.spec.ts` passes

### Implementation for User Story 3

- [ ] T022 [US3] Create `tests/e2e/sales-agent.spec.ts` — full sales agent journey spec:
  1. Login as agente1@domio.dev / Domio2026! — verify dashboard shows unread leads badge with correct count
  2. Navigate to `/panel/leads` — verify lead list shows only agente1's leads
  3. Click on a NEW lead — verify lead opens, state is NEW
  4. Verify badge decrements after opening (lead marked as read)
  5. Change state to CONTACTED — verify state transition persists and appears in history
  6. Add internal note — verify note saves and appears in timeline
  7. Change state to WON — verify final state persists
  8. RLS test: navigate directly to URL of a lead assigned to agente2 — verify access denied (403 or redirect)

**Checkpoint**: Sales agent journey passes independently

---

## Phase 6: User Story 4 — Consumidor API (Priority: P3)

**Goal**: Verify API consumer can authenticate with API key, GET /api/v1/promociones (filtered correctly), POST /api/v1/leads/institutional (with and without consent)

**Independent Test**: `pnpm test:e2e -- tests/e2e/api-consumer.spec.ts` passes

### Implementation for User Story 4

- [ ] T023 [US4] Create `tests/e2e/api-consumer.spec.ts` — full API consumer journey spec:
  1. `beforeAll`: Create API key (via direct server action import or internal endpoint) — store key for tests
  2. GET /api/v1/promociones with X-API-Key header — verify 200, verify all results have kind=portfolio and status=PUBLISHED, verify no external or DRAFT promotions appear
  3. Verify cursor pagination: first page returns `nextCursor`, verify second page works
  4. Verify privacy mode: for promotions with map_privacy_mode=AREA, verify response JSON does NOT contain `location` field (only `location_approx`)
  5. POST /api/v1/leads/institutional with valid payload + consent — verify 201 response
  6. POST /api/v1/leads/institutional without consent — verify 422 response with field detail
  7. POST /api/v1/leads/institutional with malformed payload — verify 400 response
  8. `afterAll`: Revoke the test API key

**Checkpoint**: API consumer journey passes independently

---

## Phase 7: User Story 5 — Administrador (Priority: P3)

**Goal**: Verify ADMIN can create agent, manage API keys, edit contact config (reflected in public footer), reassign leads, export CSV, execute ARSOP deletion

**Independent Test**: `pnpm test:e2e -- tests/e2e/admin.spec.ts` passes

### Implementation for User Story 5

- [ ] T024 [US5] Create `tests/e2e/admin.spec.ts` — full admin journey spec:
  1. Login as admin@domio.dev / Domio2026! — verify dashboard loads
  2. Navigate to `/panel/equipo` — create new user with AGENT role and valid email — verify user appears in list
  3. Navigate to `/panel/api-keys` — create new API key — verify key shown once — verify appears in list as active
  4. Revoke the API key — verify it appears as inactive
  5. Navigate to `/panel/contenidos/contacto` — edit phone number — save — navigate to public home — verify footer shows new phone number
  6. Navigate to `/panel/leads` — open a lead — reassign to different agent — verify lead appears as unread for new agent (login as new agent to verify)
  7. Navigate to `/panel/arsop` — select a lead — execute ARSOP delete — verify lead and associated data removed
  8. (Optional) Export lead CSV — verify file downloads

**Checkpoint**: Admin journey passes independently

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Integration, cleanup, and final validation

- [ ] T025 Remove or absorb `tests/e2e/smoke.spec.ts` into visitor.spec.ts (the homepage test is covered by T020 step 1)
- [ ] T026 Update `playwright.config.ts` if needed — ensure `reporter: 'list'` for CI, verify `webServer` config is correct
- [ ] T027 Run full suite `pnpm test:e2e` — verify all 5 journeys pass, total duration < 5 minutes
- [ ] T028 Verify quickstart.md scenarios all pass as documented
- [ ] T029 Add `data-testid` attributes to application components where `getByRole` is insufficient (coordinate with existing component files — minimal additions only)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — creates base infrastructure
- **Foundational (Phase 2)**: Depends on Phase 1 (BasePage) — creates all Page Objects and auth helper
- **US1 (Phase 3)**: Depends on Phase 2 — uses HomePage, PortafolioPage, InmuebleDetailPage, ContactoPage
- **US2 (Phase 4)**: Depends on Phase 2 — uses LoginPage, DashboardPage, CatalogoPage, CatalogoEditPage
- **US3 (Phase 5)**: Depends on Phase 2 — uses LoginPage, DashboardPage, LeadsPage, LeadDetailPage
- **US4 (Phase 6)**: Depends on Phase 2 — uses API fixtures directly (no Page Objects needed for HTTP tests)
- **US5 (Phase 7)**: Depends on Phase 2 — uses LoginPage, DashboardPage, EquipoPage, ApiKeysPage, ArsopPage, ContenidosContactoPage
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — can start after Phase 2
- **US2 (P2)**: Independent — can start after Phase 2
- **US3 (P2)**: Independent — can start after Phase 2
- **US4 (P3)**: Independent — can start after Phase 2
- **US5 (P3)**: Independent — can start after Phase 2. Note: US5 creates API key that US4 needs — but US4 creates its own key in beforeAll, so they are truly independent.

### Within Each User Story

- Page Objects are created in Phase 2 (before any spec)
- Each spec file is self-contained
- Tests run sequentially (workers: 1)

### Parallel Opportunities

- Phase 2: All Page Objects (T005–T019) can be created in parallel (different files)
- Phase 3–7: All user story specs are independent and could theoretically be written in parallel
- Phase 8: T029 (data-testid additions) can be done in parallel with T025–T028

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (BasePage, db-reset)
2. Complete Phase 2: Foundational (auth helper + Page Objects for US1: HomePage, PortafolioPage, InmuebleDetailPage, ContactoPage, LoginPage)
3. Complete Phase 3: User Story 1 (visitor.spec.ts)
4. **STOP and VALIDATE**: `pnpm test:e2e -- tests/e2e/visitor.spec.ts` passes
5. Continue with remaining stories

### Incremental Delivery

1. Setup + Foundational → All Page Objects ready
2. US1 (visitor) → Verify public surface works
3. US2 (catalog editor) → Verify backoffice editing works
4. US3 (sales agent) → Verify lead management works
5. US4 (API consumer) → Verify API integration works
6. US5 (admin) → Verify administration works
7. Polish → Clean up, remove smoke test, full suite validation

---

## Notes

- [P] tasks = different files, no dependencies — can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- DB reset happens in `beforeAll` of each spec (not `beforeEach` — performance)
- Credentials from seed: admin@domio.dev, agente1@domio.dev, agente2@domio.dev, operador1@domio.dev — all with password `Domio2026!`
- API keys are NOT in seed — created within the test that needs them
- No CSS class selectors or XPath — only getByRole, getByTestId, getByText
- `data-testid` additions to app components should be minimal and only where accessibility selectors are insufficient
