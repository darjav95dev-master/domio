# Tasks: Catalog Management (F011)

**Input**: Design documents from `/specs/011-catalog-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-api.md

**Tests**: TDD obligatorio para lógica de dominio (constitution §3). Tests unitarios para slug generator, repositorios, schemas Zod. Tests de integración para API routes.

**Organization**: Tasks grouped by user story (US1-US5) per spec.md priorities.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schemas Zod compartidos y generador de slugs — base para todas las user stories

- [ ] T001 Create Zod schemas for promocion in src/shared/schemas/promocion.schema.ts (PromocionCreateSchema, PromocionUpdateSchema, PromocionDraftSchema with conditional validation for PUBLISHED status)
- [ ] T002 [P] Create Zod schemas for tipologia in src/shared/schemas/tipologia.schema.ts (TipologiaSchema with amenities validated against AMENITIES closed set)
- [ ] T003 [P] Create Zod schemas for unidad in src/shared/schemas/unidad.schema.ts (UnidadSchema with status enum)
- [ ] T004 Implement deterministic slug generator in src/infrastructure/slug/generate-slug.ts (pure function: propertyType + operation + municipality + bedrooms + shortId → slug string, with normalization: lowercase, accent removal, spaces → hyphens)
- [ ] T005 Write unit tests for slug generator in src/infrastructure/slug/generate-slug.spec.ts (test format, normalization, uniqueness with different id_corto, edge cases: no bedrooms, SALE_AND_RENT operation)

**Checkpoint**: Schemas Zod compilan y tests de slug pasan. Base lista para user stories.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repositorios context-aware y API routes base — todo user story los necesita

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Implement PromocionRepository in src/infrastructure/db/repositories/promocion.repository.ts (extends TenantAwareRepository: findAll with filters+pagination, findById with tipologias+unidades, create, update, delete, updateDraft, getHistory — all methods use withTransaction + SET LOCAL, history recording on update comparing old vs new field values)
- [ ] T007 [P] Implement TipologiaRepository in src/infrastructure/db/repositories/tipologia.repository.ts (extends TenantAwareRepository: findByPromocionId, create, update, delete — all within tenant transaction)
- [ ] T008 [P] Implement UnidadRepository in src/infrastructure/db/repositories/unidad.repository.ts (extends TenantAwareRepository: findByTipologiaId, create, update, delete — all within tenant transaction)
- [ ] T009 Write unit tests for PromocionRepository in src/infrastructure/db/repositories/promocion.repository.spec.ts (test CRUD, filter queries, history recording, draft update isolation, slug generation on publish)
- [ ] T010 [P] Write unit tests for TipologiaRepository in src/infrastructure/db/repositories/tipologia.repository.spec.ts (test CRUD within tenant context)
- [ ] T011 [P] Write unit tests for UnidadRepository in src/infrastructure/db/repositories/unidad.repository.spec.ts (test CRUD within tenant context)

**Checkpoint**: Repositorios funcionales con tests. API routes pueden comenzar.

---

## Phase 3: User Story 1 — Listar y filtrar promociones (P1) MVP

**Goal**: El operador ve el listado de promociones con filtros funcionales y navegación a edición/creación.

**Independent Test**: Acceder a `/panel/catalogo` autenticado, ver promociones del seed, aplicar filtros por kind/status/municipality, verificar scope por rol (AGENT solo ve las suyas).

### Implementation for User Story 1

- [ ] T012 [US1] Create GET /api/internal/promociones route handler in app/api/internal/promociones/route.ts (resolves AuthenticatedContext from session, calls PromocionRepository.findAll with query params for filters: status, kind, island, municipality, assignedAgentId, constructionStatus, page, limit — applies role scope: AGENT filters by assignedAgentId=userId)
- [ ] T013 [US1] Create catalog filters component in src/features/promociones/components/catalog-filters.tsx (client component with form controls for each filter: status select, kind select, island select, municipality select, agent select, constructionStatus select — uses domain-labels.ts for display labels, submits via URL search params)
- [ ] T014 [US1] Create catalog list component in src/features/promociones/components/catalog-list.tsx (server component that fetches from GET /api/internal/promociones, renders table with columns: name, propertyType, operation, status, kind, municipality, assignedAgent — status badges with colors from status-colors.ts, links to edit page)
- [ ] T015 [US1] Replace placeholder page in app/(auth)/panel/catalogo/page.tsx (server component with auth guard, renders catalog-filters + catalog-list, "Nueva promoción" button linking to /panel/catalogo/nueva, reads search params for filters)
- [ ] T016 [US1] Create POST /api/internal/promociones route handler in app/api/internal/promociones/route.ts (add POST to existing route file: validates body with PromocionCreateSchema, creates promoción with status=DRAFT via PromocionRepository, returns 201 with new promoción — used by "Nueva promoción" button)

**Checkpoint**: Listado funcional con filtros. Se puede crear promoción vacía (DRAFT). Navegación a edición funciona.

---

## Phase 4: User Story 2 — Crear y editar una promoción (P1)

**Goal**: Formulario de edición completo con secciones, gestión de tipologías/unidades, publicación con slug.

**Independent Test**: Crear promoción, rellenar secciones, guardar como borrador, publicar (slug generado), renombrar (slug inmutable), warning suave construction_status.

### Implementation for User Story 2

- [ ] T017 [US2] Create GET /api/internal/promociones/[id] route handler in app/api/internal/promociones/[id]/route.ts (resolves AuthenticatedContext, fetches promoción with tipologias+unidades via PromocionRepository.findById, checks role scope for AGENT, computes constructionWarning by comparing constructionStatus with plazos_garantias block if exists, returns 200)
- [ ] T018 [US2] Create PATCH /api/internal/promociones/[id] route handler in app/api/internal/promociones/[id]/route.ts (add PATCH to existing file: validates body with PromocionUpdateSchema, if status→PUBLISHED and slug empty generates slug via generateSlug, calls PromocionRepository.update which records history, if published triggers revalidateTag('promocion:{slug}') + revalidateTag('catalog'), returns 200)
- [ ] T019 [US2] Create DELETE /api/internal/promociones/[id] route handler in app/api/internal/promociones/[id]/route.ts (add DELETE: only ADMIN/OPERATOR, calls PromocionRepository.delete, triggers revalidateTag if was published, returns 204)
- [ ] T020 [US2] Create identity section component in src/features/promociones/components/promocion-section-identity.tsx (client component: name input, propertyType select, operation select, kind select — uses PROPERTY_TYPES and OPERATION_TYPES from db-enums.ts with labels from domain-labels.ts, all with aria-labels)
- [ ] T021 [US2] Create commercial status section component in src/features/promociones/components/promocion-section-commercial-status.tsx (client component: status select with PROMOTION_STATUS_LABELS, constructionStatus select with CONSTRUCTION_STATUS_LABELS, warning banner when constructionWarning is present — yellow bg, non-blocking, dismissible)
- [ ] T022 [US2] Create location section component in src/features/promociones/components/promocion-section-location.tsx (client component: island input, municipality input, address input, coordinates inputs [lng/lat], mapPrivacyMode radio [EXACT/AREA] — all optional with labels)
- [ ] T023 [US2] Create SEO section component in src/features/promociones/components/promocion-section-seo.tsx (client component: seoTitle input with char counter max 70, seoDescription textarea with char counter max 160, helper text explaining fallback will apply if empty)
- [ ] T024 [US2] Create agent section component in src/features/promociones/components/promocion-section-agent.tsx (client component: select with list of tenant users with role AGENT, fetched from internal endpoint or passed as prop)
- [ ] T025 [US2] Create main promotion form component in src/features/promociones/components/promocion-form.tsx (client component: composes all section components, manages form state with useReducer, validates with PromocionUpdateSchema on submit, shows section errors, save as draft / publish buttons, discard draft button, displays draft indicator if draftPayload exists)
- [ ] T026 [US2] Create tipologia editor component in src/features/promociones/components/tipologia-editor.tsx (client component: list of tipologías with expand/collapse, each with inline form for all TipologiaSchema fields, add/remove buttons, amenities as checkbox group from AMENITIES closed set, nested unidad-editor per tipologia)
- [ ] T027 [US2] Create unidad editor component in src/features/promociones/components/unidad-editor.tsx (client component: list of unidades within a tipologia, inline form for identifier + status select, add/remove buttons)
- [ ] T028 [US2] Create edit page in app/(auth)/panel/catalogo/[id]/page.tsx (server component with auth guard, fetches promoción via GET /api/internal/promociones/[id], renders promocion-form with data, includes tipologia-editor section)
- [ ] T029 [US2] Create new promotion redirect page in app/(auth)/panel/catalogo/nueva/page.tsx (server action: creates empty DRAFT promoción via POST /api/internal/promociones, redirects to /panel/catalogo/[id] edit page)

**Checkpoint**: CRUD completo funcional. Se puede crear, editar, publicar (slug generado), y eliminar promociones con tipologías y unidades.

---

## Phase 5: User Story 3 — Autoguardado de borrador (P2)

**Goal**: El formulario autoguarda cada 30s en draft_payload. Sobrevive a refresco. Publicar aplica el draft. Descartar lo limpia.

**Independent Test**: Editar promoción, esperar 30s, recargar → datos restaurados. Publicar → draftPayload=NULL. Descartar → draftPayload=NULL.

### Implementation for User Story 3

- [ ] T030 [US3] Create PATCH /api/internal/promociones/[id]/draft route handler in app/api/internal/promociones/[id]/draft/route.ts (validates body, calls PromocionRepository.updateDraft which ONLY updates draftPayload column — does NOT modify other fields, does NOT record history, does NOT trigger revalidation, returns 200 with updated draftPayload + updatedAt)
- [ ] T031 [US3] Create autosave hook in src/features/promociones/hooks/use-autosave.ts (client hook: takes form state and promocionId, uses useEffect + setInterval 30s to PATCH draft endpoint, tracks isSaving state, returns { lastSavedAt, isSaving, error } — debounced to avoid overlapping requests)
- [ ] T032 [US3] Create draft indicator component in src/features/promociones/components/draft-indicator.tsx (client component: shows "Borrador guardado hace X segundos" with aria-live="polite", visual indicator [green dot + timestamp], shows "Restaurando borrador..." banner on page load if draftPayload exists)
- [ ] T033 [US3] Create draft restore hook in src/features/promociones/hooks/use-draft-restore.ts (client hook: on mount, checks if draftPayload exists, if so returns it as initial form state, provides applyDraft/discardDraft functions — discardDraft calls PATCH with null to clear)
- [ ] T034 [US3] Integrate autosave into promocion-form in src/features/promociones/components/promocion-form.tsx (add useAutosave hook, wire form state changes to autosave, add draft-indicator component, on publish: apply draftPayload to form then save, on discard: clear draftPayload and reset form to published values)

**Checkpoint**: Autoguardado funcional. Sobrevive a refresco. Publicar aplica y limpia draft. Descartar limpia sin modificar publicados.

---

## Phase 6: User Story 4 — Histórico de cambios (P2)

**Goal**: Cada cambio en promoción publicada se registra en promocion_history. Consultable desde la UI.

**Independent Test**: Editar promoción publicada, verificar filas en histórico. Intentar UPDATE/DELETE en histórico → falla.

### Implementation for User Story 4

- [ ] T035 [US4] Create GET /api/internal/promociones/[id]/history route handler in app/api/internal/promociones/[id]/history/route.ts (calls PromocionRepository.getHistory, joins with users table for authorName, returns items sorted by createdAt DESC)
- [ ] T036 [US4] Create history panel component in src/features/promociones/components/history-panel.tsx (client component: fetches history, renders chronological list with: field name (human-readable), old value, new value, author name, timestamp — uses formatDistanceToNow for relative time, collapsible entries)
- [ ] T037 [US4] Create history page in app/(auth)/panel/catalogo/[id]/history/page.tsx (server component with auth guard, fetches promoción + history, renders history-panel with back link to edit page)

**Checkpoint**: Histórico visible y completo. Inmutabilidad verificada por tests de repositorio.

---

## Phase 7: User Story 5 — Revalidación ISR (P3)

**Goal**: Al guardar promoción publicada, se disparan revalidateTag para ficha y catálogo.

**Independent Test**: Guardar promoción publicada, verificar que revalidateTag se invoca con tags correctas (test unitario del handler).

### Implementation for User Story 5

- [ ] T038 [US5] Add revalidateTag calls to PATCH handler in app/api/internal/promociones/[id]/route.ts (after successful update of published promoción: import { revalidateTag } from 'next/cache', call revalidateTag('promocion:{slug}') and revalidateTag('catalog') — only if promoción has slug; for draft without slug, only revalidateTag('catalog'))
- [ ] T039 [US5] Add revalidateTag to DELETE handler in app/api/internal/promociones/[id]/route.ts (after successful delete of published promoción: revalidateTag('promocion:{slug}') + revalidateTag('catalog'))

**Checkpoint**: ISR revalidación funcional. Cambios en backoffice se reflejan en superficies públicas sin redeploy.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales, limpieza, validación final

- [ ] T040 Add role-based access control to all API routes (verify AGENT scope on GET/PATCH/DELETE /api/internal/promociones/[id] — AGENT can only access assigned promociones, return 403 otherwise)
- [ ] T041 Add comprehensive error handling and consistent error responses across all API routes (Zod validation errors → 400 with field details, not found → 404, forbidden → 403)
- [ ] T042 Run quickstart.md validation scenarios V-001 through V-012
- [ ] T043 Code cleanup: remove console.logs, verify all aria attributes, check focus management in forms, verify keyboard navigation
- [ ] T044 Run full test suite: pnpm vitest run --reporter=dot && pnpm typecheck && pnpm lint

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — starts immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (schemas + slug generator needed by repos)
- **Phase 3 (US1 - Listado)**: Depends on Phase 2 (repositorios needed for GET)
- **Phase 4 (US2 - CRUD)**: Depends on Phase 2 + Phase 3 (necesita el listado para navegación)
- **Phase 5 (US3 - Autosave)**: Depends on Phase 4 (necesita el formulario de edición)
- **Phase 6 (US4 - Histórico)**: Depends on Phase 4 (necesita promoción publicada con cambios)
- **Phase 7 (US5 - ISR)**: Depends on Phase 4 (necesita el PATCH handler)
- **Phase 8 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: After Foundational. No story dependencies.
- **US2 (P1)**: After Foundational + US1 (listado provides navigation entry point).
- **US3 (P2)**: After US2 (needs the edit form).
- **US4 (P2)**: After US2 (needs published promoción with changes).
- **US5 (P3)**: After US2 (needs PATCH handler to add revalidation).

### Within Each Phase

- Schemas before repos (Phase 1 → Phase 2)
- Repos before API routes (Phase 2 → Phase 3+)
- API routes before UI components (within each story)
- Core form before section components integration (US2)

### Parallel Opportunities

- T002, T003 (schemas) can run parallel with T001
- T007, T008 (repos) can run parallel with T006
- T009, T010, T011 (repo tests) can run parallel
- T020-T024 (section components) can run in parallel once form structure is defined
- T038, T039 (revalidateTag) can run in parallel

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup (schemas + slug)
2. Complete Phase 2: Foundational (repos)
3. Complete Phase 3: US1 (listado + filtros)
4. Complete Phase 4: US2 (CRUD + publicación)
5. **STOP and VALIDATE**: CRUD completo funcional
6. Commit: "feat(011): catalog CRUD with listing, filters, and publication"

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Listado funcional → Demo (MVP parcial!)
3. US2 → CRUD completo → Demo (MVP completo!)
4. US3 → Autoguardado → Demo
5. US4 → Histórico → Demo
6. US5 → ISR → Demo
7. Polish → Validate + cleanup

---

## Notes

- All repos extend TenantAwareRepository and use withTransaction for SET LOCAL
- Slug generation is a pure function — no DB access needed
- draft_payload is independent from published fields (architecture §7.14)
- History recording happens inside the same transaction as the update (atomicity)
- constructionWarning is computed server-side and sent to client (not stored)
- Revalidation only fires for published promociones with slug
- AGENT scope is enforced at repository level (filter by assignedAgentId)
