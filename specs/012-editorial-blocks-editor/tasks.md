# Tasks: Editorial Blocks Editor

**Input**: Design documents from `/specs/012-editorial-blocks-editor/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Tests**: TDD approach — tests written before implementation for repository and validation logic.

**Organization**: Tasks grouped by user story per spec.md priorities.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and prepare migration for the constraint trigger.

- [ ] T001 Install `@dnd-kit/core` and `@dnd-kit/sortable` dependencies via pnpm
- [ ] T002 Create migration for `check_block_kind_constraint()` trigger function and trigger on `promocion_content_blocks` in `drizzle/migrations/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repository methods and Zod schema refinement that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Write failing integration tests for new repository methods in `tests/integration/content-blocks-repository.test.ts`
- [ ] T004 Implement `findAllContentBlocks(promocionId)` in `src/infrastructure/db/repositories/promocion.repository.ts`
- [ ] T005 Implement `upsertContentBlock(promocionId, blockType, payload, userId)` with kind validation in `src/infrastructure/db/repositories/promocion.repository.ts`
- [ ] T006 Implement `deleteContentBlock(promocionId, blockId)` with sort_order reindex in `src/infrastructure/db/repositories/promocion.repository.ts`
- [ ] T007 Implement `reorderContentBlocks(promocionId, orderedBlockIds)` in `src/infrastructure/db/repositories/promocion.repository.ts`
- [ ] T008 Implement `validateBlocksForPublish(promocionId)` in `src/infrastructure/db/repositories/promocion.repository.ts`
- [ ] T009 Refine Zod schemas in `src/shared/types/content-block-schema.ts` — add min length constraints, required fields, HTML sanitization validation for DESCRIPCION_GENERAL
- [ ] T010 Write unit tests for refined Zod schemas in `src/shared/types/__tests__/content-block-schema.test.ts`

**Checkpoint**: Repository methods and Zod schemas ready. All tests green.

---

## Phase 3: User Story 1 — Crear y editar bloques editoriales (Priority: P1) 🎯 MVP

**Goal**: El operador puede crear, editar y eliminar bloques de los 5 tipos desde la edición de promoción.

**Independent Test**: Acceder a `/panel/catalogo/[id]`, crear un bloque de cada tipo, editar, eliminar, verificar persistencia tras recarga.

### Implementation for User Story 1

- [ ] T011 [US1] Create server action `upsertContentBlockAction` in `src/features/promociones/actions/content-blocks.actions.ts`
- [ ] T012 [US1] Create server action `deleteContentBlockAction` in `src/features/promociones/actions/content-blocks.actions.ts`
- [ ] T013 [P] [US1] Create `BlockFormDescripcion` component in `src/features/promociones/components/block-form-descripcion.tsx`
- [ ] T014 [P] [US1] Create `BlockFormCalidades` component in `src/features/promociones/components/block-form-calidades.tsx`
- [ ] T015 [P] [US1] Create `BlockFormZonas` component in `src/features/promociones/components/block-form-zonas.tsx`
- [ ] T016 [P] [US1] Create `BlockFormUbicacion` component in `src/features/promociones/components/block-form-ubicacion.tsx`
- [ ] T017 [P] [US1] Create `BlockFormPlazos` component in `src/features/promociones/components/block-form-plazos.tsx`
- [ ] T018 [US1] Create `BlocksEditor` client component (block list, add/edit/delete UI) in `src/features/promociones/components/blocks-editor.tsx`
- [ ] T019 [US1] Integrate `BlocksEditor` into `app/(auth)/panel/catalogo/[id]/page.tsx` as new section after existing sections
- [ ] T020 [US1] Update page to load existing blocks via `findAllContentBlocks` and pass to `BlocksEditor`

**Checkpoint**: User Story 1 fully functional — blocks can be created, edited, and deleted from the promotion editor.

---

## Phase 4: User Story 2 — Restricción de bloques por kind (Priority: P1)

**Goal**: Los bloques ZONAS_COMUNES y PLAZOS_GARANTIAS son inaccesibles en promociones kind='external'.

**Independent Test**: Acceder a una promoción external, verificar que el selector no muestra los bloques restringidos. Intentar crear vía API, verificar error 422.

### Implementation for User Story 2

- [ ] T021 [US2] Update `BlocksEditor` to filter available block types based on promotion kind in `src/features/promociones/components/blocks-editor.tsx`
- [ ] T022 [US2] Update `upsertContentBlock` repository method to reject ZONAS_COMUNES/PLAZOS_GARANTIAS for kind='external' with explicit error in `src/infrastructure/db/repositories/promocion.repository.ts`
- [ ] T023 [US2] Write integration test for kind constraint (repository + trigger) in `tests/integration/block-kind-constraint.test.ts`
- [ ] T024 [US2] Update server action to return validation error for kind constraint violations in `src/features/promociones/actions/content-blocks.actions.ts`

**Checkpoint**: Kind restriction works in UI and backend. Tests green.

---

## Phase 5: User Story 3 — Reordenar bloques (Priority: P2)

**Goal**: El operador puede reordenar bloques mediante drag & drop.

**Independent Test**: Crear 3+ bloques, reordenar por drag & drop, recargar, verificar que el orden persiste.

### Implementation for User Story 3

- [ ] T025 [US3] Create server action `reorderContentBlocksAction` in `src/features/promociones/actions/content-blocks.actions.ts`
- [ ] T026 [US3] Add drag & drop reordering to `BlocksEditor` using `@dnd-kit/sortable` in `src/features/promociones/components/blocks-editor.tsx`
- [ ] T027 [US3] Wire reorder action to server action on drag end in `src/features/promociones/components/blocks-editor.tsx`

**Checkpoint**: Blocks can be reordered by drag & drop. Order persists after reload.

---

## Phase 6: User Story 4 — Validación Zod y bloqueo de publicación (Priority: P2)

**Goal**: La validación Zod funciona en cliente y servidor. La publicación se bloquea si hay bloques inválidos.

**Independent Test**: Intentar guardar un bloque con campos vacíos (error en cliente). Intentar publicar con bloque inválido (bloqueo).

### Implementation for User Story 4

- [ ] T028 [US4] Add Zod validation to each block form component (client-side) with error messages per field
- [ ] T029 [US4] Update `upsertContentBlockAction` to validate payload with Zod before persisting (server-side) in `src/features/promociones/actions/content-blocks.actions.ts`
- [ ] T030 [US4] Integrate `validateBlocksForPublish` check into the publish flow in `app/(auth)/panel/catalogo/[id]/page.tsx`
- [ ] T031 [US4] Add error display for publish blocking (which block is invalid) in `src/features/promociones/components/blocks-editor.tsx`

**Checkpoint**: Validation works in client and server. Publish blocked when blocks are invalid.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, cleanup, and verification.

- [ ] T032 Run migration on development database and verify trigger works
- [ ] T033 Update seed data to include diverse block examples in `scripts/seed.ts`
- [ ] T034 Run `pnpm vitest run --reporter=dot` and verify all tests pass
- [ ] T035 Run `pnpm typecheck` and fix any type errors
- [ ] T036 Run `pnpm lint` on modified files and fix any lint errors
- [ ] T037 Run quickstart.md validation scenarios manually
- [ ] T038 Code cleanup — remove unused imports, verify no `any` types, check sonarjs complexity

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (builds on the same components)
- **Phase 5 (US3)**: Depends on Phase 3 (modifies BlocksEditor)
- **Phase 6 (US4)**: Depends on Phase 3 (adds validation to forms)
- **Phase 7 (Polish)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Core editor — no story dependencies
- **US2 (P1)**: Kind restriction — modifies US1 components
- **US3 (P2)**: Reorder — modifies US1 components
- **US4 (P2)**: Validation — modifies US1 forms and publish flow

### Parallel Opportunities

- T013–T017 (block form components) can all run in parallel
- T004–T008 (repository methods) have sequential dependency (each builds on the same file)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T010)
3. Complete Phase 3: User Story 1 (T011–T020)
4. **STOP and VALIDATE**: Test block creation/editing/deletion independently
5. Continue to US2, US3, US4

### Incremental Delivery

1. Setup + Foundational → Repository + Zod ready
2. US1 → Basic editor works → MVP!
3. US2 → Kind restriction added
4. US3 → Drag & drop added
5. US4 → Validation hardened
6. Polish → Migration, seed, verify

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- TDD: Tests written before implementation in Phase 2 (repository) and Phase 4 (kind constraint)
- Block form components (T013–T017) are independent and can be parallelized
- The migration (T002) should be tested locally before proceeding
- All repository methods use `withTransaction` for SET LOCAL compliance
