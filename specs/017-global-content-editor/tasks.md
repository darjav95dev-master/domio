# Tasks: global-content-editor

**Input**: Design documents from `/specs/017-global-content-editor/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: TDD approach — tests are included for all business logic (repositories, services, server actions).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create feature directory structure and shared types

- [ ] T001 Create feature directory structure: `src/features/contenidos/server/`, `src/features/contenidos/components/`, `src/features/contenidos/actions/`
- [ ] T002 [P] Create shared types in `src/shared/types/content.types.ts` — PageKey, BlockKey, ContentType union types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repositories, Zod schemas, and base service that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Repositories (context-aware, SET LOCAL pattern)

- [ ] T003 [P] Create ContentBlockRepository in `src/features/contenidos/server/content-block.repository.ts` — methods: findByTenantAndPage, findByTenantPageAndBlock, upsert
- [ ] T004 [P] Create ContactConfigRepository in `src/features/contenidos/server/contact-config.repository.ts` — methods: findByTenant, upsert
- [ ] T005 [P] Create ContentHistoryRepository in `src/features/contenidos/server/content-history.repository.ts` — methods: findByContent, create, findById
- [ ] T006 Write tests for ContentBlockRepository in `src/features/contenidos/server/__tests__/content-block.repository.test.ts`
- [ ] T007 Write tests for ContactConfigRepository in `src/features/contenidos/server/__tests__/contact-config.repository.test.ts`
- [ ] T008 Write tests for ContentHistoryRepository in `src/features/contenidos/server/__tests__/content-history.repository.test.ts`

### Zod Schemas

- [ ] T009 [P] Create content block Zod schemas in `src/features/contenidos/server/schemas/content-block.schema.ts` — one schema per block_key (hero, como-trabajamos, sobre, portafolio-destacado, confianza, cta-final, faq, cuerpo, miembros, contenido)
- [ ] T010 [P] Create contact config Zod schema in `src/features/contenidos/server/schemas/contact-config.schema.ts`
- [ ] T011 Create schema registry/map in `src/features/contenidos/server/schemas/block-schema-registry.ts` — maps page_key+block_key to the correct Zod schema
- [ ] T012 Write tests for Zod schemas in `src/features/contenidos/server/schemas/__tests__/schemas.test.ts` — valid payloads, invalid payloads, edge cases

### Base Service

- [ ] T013 Create ContentService in `src/features/contenidos/server/content.service.ts` — orchestrates repositories, validates payloads with Zod, creates history entries, triggers revalidateTag
- [ ] T014 Write tests for ContentService in `src/features/contenidos/server/__tests__/content.service.test.ts` — mock repositories, verify validation, history creation, revalidation

**Checkpoint**: Foundation ready — repositories, schemas, and service are tested and functional

---

## Phase 3: User Story 1 - Edición de bloques de contenido global (Priority: P1) 🎯 MVP

**Goal**: ADMIN y OPERATOR pueden editar bloques de contenido global organizados por página, con validación Zod y revalidación ISR.

**Independent Test**: Acceder a `/panel/contenidos`, seleccionar una página, editar un bloque, guardar, verificar que el cambio se persiste y se refleja en la página pública tras ISR.

### Server Actions

- [ ] T015 [US1] Create server action `saveContentBlock` in `src/features/contenidos/actions/content-block.actions.ts` — validates session/role, validates payload with Zod, calls ContentService.saveBlock, returns result
- [ ] T016 [US1] Write tests for `saveContentBlock` action in `src/features/contenidos/actions/__tests__/content-block.actions.test.ts`

### API Route

- [ ] T017 [US1] Create API route `POST /api/internal/content/blocks` in `app/api/internal/content/blocks/route.ts` — validates session/role, parses body, calls saveContentBlock action, returns JSON
- [ ] T018 [US1] Create API route `GET /api/internal/content/blocks?pageKey=` in `app/api/internal/content/blocks/route.ts` — validates session/role, queries ContentBlockRepository, returns JSON
- [ ] T019 [US1] Write tests for API routes in `app/api/internal/content/blocks/__tests__/route.test.ts`

### UI Components

- [ ] T020 [US1] Create `ContenidosPageClient` component in `src/features/contenidos/components/ContenidosPageClient.tsx` — client component with page selector, block list, save button, toast feedback
- [ ] T021 [US1] Create `ContentBlockEditor` component in `src/features/contenidos/components/ContentBlockEditor.tsx` — renders the appropriate form for a block based on block_key, handles form state, calls save action
- [ ] T022 [P] [US1] Create block-specific form components in `src/features/contenidos/components/BlockFormFields/` — HeroBlockForm, ComoTrabajamosBlockForm, SobreBlockForm, PortafolioDestacadoBlockForm, ConfianzaBlockForm, CtaFinalBlockForm, FaqBlockForm, CuerpoBlockForm, MiembrosBlockForm, LegalContentBlockForm
- [ ] T023 [US1] Create empty state component in `src/features/contenidos/components/EmptyContentState.tsx` — "Aún no hay contenido para esta página" + "Crear primer bloque" button

### Page Integration

- [ ] T024 [US1] Replace placeholder page at `app/(auth)/panel/contenidos/page.tsx` — server component with auth guard + role check (ADMIN/OPERATOR), fetches pages list, renders ContenidosPageClient
- [ ] T025 [US1] Create dynamic page at `app/(auth)/panel/contenidos/[pageKey]/page.tsx` — server component with auth guard + role check, fetches blocks for pageKey, renders ContentBlockEditor for each block
- [ ] T026 [US1] Add error handling and loading states in page components

**Checkpoint**: User Story 1 is fully functional — ADMIN/OPERATOR can edit and save content blocks, changes persist and trigger ISR revalidation

---

## Phase 4: User Story 2 - Configuración de contacto global (Priority: P1)

**Goal**: ADMIN y OPERATOR pueden editar la configuración de contacto global (teléfono, email, dirección, horario, WhatsApp), con revalidación ISR del footer y páginas de contacto.

**Independent Test**: Acceder a `/panel/contenidos/contacto`, editar campos, guardar, verificar que el cambio se persiste y se refleja en el footer público tras ISR.

### Server Actions

- [ ] T027 [US2] Create server action `saveContactConfig` in `src/features/contenidos/actions/contact-config.actions.ts` — validates session/role, validates payload with Zod, calls ContentService.saveContactConfig, returns result
- [ ] T028 [US2] Write tests for `saveContactConfig` action in `src/features/contenidos/actions/__tests__/contact-config.actions.test.ts`

### API Route

- [ ] T029 [US2] Create API route `PUT /api/internal/content/contact` in `app/api/internal/content/contact/route.ts` — validates session/role, parses body, calls saveContactConfig action, returns JSON
- [ ] T030 [US2] Create API route `GET /api/internal/content/contact` in `app/api/internal/content/contact/route.ts` — validates session/role, queries ContactConfigRepository, returns JSON
- [ ] T031 [US2] Write tests for API routes in `app/api/internal/content/contact/__tests__/route.test.ts`

### UI Components

- [ ] T032 [US2] Create `ContactConfigForm` component in `src/features/contenidos/components/ContactConfigForm.tsx` — form with phone, email, address, hours, whatsappNumber, whatsappPrefilledMessage fields, handles form state, calls save action, shows toast feedback

### Page Integration

- [ ] T033 [US2] Create page at `app/(auth)/panel/contenidos/contacto/page.tsx` — server component with auth guard + role check, fetches current contact config, renders ContactConfigForm
- [ ] T034 [US2] Add error handling and loading states in contact page

**Checkpoint**: User Stories 1 AND 2 are both functional — content blocks and contact config can be edited independently

---

## Phase 5: User Story 3 - Historial versionado y revert (Priority: P2)

**Goal**: ADMIN y OPERATOR pueden navegar el historial de versiones de cualquier bloque o configuración de contacto, y revertir a cualquier versión anterior con un clic confirmado.

**Independent Test**: Editar un bloque dos veces, acceder al historial, ver las 3 versiones (inicial + 2 ediciones), revertir a la primera versión, verificar que el contenido vuelve al estado original y se genera una nueva entrada en el historial.

### Server Actions

- [ ] T035 [US3] Create server action `getContentHistory` in `src/features/contenidos/actions/content-history.actions.ts` — validates session/role, queries ContentHistoryRepository by contentType+contentKey, returns list
- [ ] T036 [US3] Create server action `revertContent` in `src/features/contenidos/actions/content-history.actions.ts` — validates session/role, fetches history entry, calls ContentService.revert, returns result
- [ ] T037 [US3] Write tests for history actions in `src/features/contenidos/actions/__tests__/content-history.actions.test.ts`

### API Routes

- [ ] T038 [US3] Create API route `GET /api/internal/content/history?contentType=&contentKey=` in `app/api/internal/content/history/route.ts` — validates session/role, queries history, returns JSON
- [ ] T039 [US3] Create API route `POST /api/internal/content/revert` in `app/api/internal/content/revert/route.ts` — validates session/role, calls revertContent action, returns JSON
- [ ] T040 [US3] Write tests for history API routes in `app/api/internal/content/history/__tests__/route.test.ts`

### UI Components

- [ ] T041 [US3] Create `ContentHistoryView` component in `src/features/contenidos/components/ContentHistoryView.tsx` — displays chronological list of versions with timestamp, author, payload preview, revert button with confirmation dialog
- [ ] T042 [US3] Create `RevertConfirmationDialog` component in `src/features/contenidos/components/RevertConfirmationDialog.tsx` — modal dialog "¿Revertir a la versión del [timestamp]? Esta acción creará una nueva versión en el historial." with Confirm/Cancel buttons
- [ ] T043 [US3] Add "Ver historial" button to ContentBlockEditor and ContactConfigForm components

### Page Integration

- [ ] T044 [US3] Create history page at `app/(auth)/panel/contenidos/[pageKey]/history/page.tsx` — server component with auth guard + role check, fetches history for block, renders ContentHistoryView
- [ ] T045 [US3] Create history page at `app/(auth)/panel/contenidos/contacto/history/page.tsx` — server component with auth guard + role check, fetches history for contact config, renders ContentHistoryView
- [ ] T046 [US3] Add error handling and loading states in history pages

**Checkpoint**: All user stories are independently functional — content blocks, contact config, and history/revert all work

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T047 [P] Add comprehensive error messages and validation feedback across all forms
- [ ] T048 [P] Add loading skeletons for all pages and components
- [ ] T049 [P] Add aria-live regions for toast notifications and async operations
- [ ] T050 Verify all forms have proper labels and focus management (WCAG AA)
- [ ] T051 Code cleanup and refactoring across all components
- [ ] T052 Run quickstart.md validation scenarios end-to-end
- [ ] T053 Update seed data to include sample content_blocks and contact_config for testing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if team capacity allows)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — No dependencies on US1, independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) — No dependencies on US1/US2, independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Server actions before API routes
- API routes before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational repositories (T003, T004, T005) can run in parallel
- All Foundational schemas (T009, T010) can run in parallel
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Block-specific form components (T022) can run in parallel
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all repositories together:
Task: "Create ContentBlockRepository in src/features/contenidos/server/content-block.repository.ts"
Task: "Create ContactConfigRepository in src/features/contenidos/server/contact-config.repository.ts"
Task: "Create ContentHistoryRepository in src/features/contenidos/server/content-history.repository.ts"

# Launch all schemas together:
Task: "Create content block Zod schemas in src/features/contenidos/server/schemas/content-block.schema.ts"
Task: "Create contact config Zod schema in src/features/contenidos/server/schemas/contact-config.schema.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (edit a block, save, verify persistence and ISR)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (content blocks)
   - Developer B: User Story 2 (contact config)
   - Developer C: User Story 3 (history/revert)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

## Summary

- **Total tasks**: 53
- **Phase 1 (Setup)**: 2 tasks
- **Phase 2 (Foundational)**: 12 tasks (repositories, schemas, service, tests)
- **Phase 3 (US1 - Content Blocks)**: 12 tasks (actions, API, UI, pages)
- **Phase 4 (US2 - Contact Config)**: 8 tasks (actions, API, UI, pages)
- **Phase 5 (US3 - History/Revert)**: 12 tasks (actions, API, UI, pages)
- **Phase 6 (Polish)**: 7 tasks

**MVP scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 26 tasks
