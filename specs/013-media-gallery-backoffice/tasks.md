# Tasks: Media Gallery Backoffice

**Input**: Design documents from `/specs/013-media-gallery-backoffice/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Tests**: TDD approach — tests escritos antes de implementación para validación y operaciones.

**Organization**: Tasks grouped by user story per spec.md priorities.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup adicional necesario — MediaService ya existe (F006), @dnd-kit/sortable ya instalado (F012).

- [ ] T001 Verificar que MediaService está funcional y accesible desde server actions en `src/infrastructure/media/MediaService.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server actions y validación Zod que todas las user stories necesitan.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Write failing unit tests for Zod validation schemas in `tests/unit/media-validation.test.ts`
- [ ] T003 Implement Zod schemas for media validation in `src/shared/types/media-schema.ts` — alt_text non-empty, kind enum
- [ ] T004 Write failing integration tests for media operations in `tests/integration/media-operations.test.ts`
- [ ] T005 Implement `uploadMediaAction` server action in `src/features/promociones/actions/media.actions.ts`
- [ ] T006 Implement `deleteMediaAction` server action in `src/features/promociones/actions/media.actions.ts`
- [ ] T007 Implement `reorderMediaAction` server action in `src/features/promociones/actions/media.actions.ts`
- [ ] T008 Implement `setCoverAction` server action in `src/features/promociones/actions/media.actions.ts`
- [ ] T009 Implement `validateMediaForPublish` function in `src/features/promociones/actions/media.actions.ts`

**Checkpoint**: Server actions y validación Zod listos. All tests green.

---

## Phase 3: User Story 1 — Subir y gestionar imágenes de galería (Priority: P1) 🎯 MVP

**Goal**: El operador puede subir, reordenar, marcar portada y eliminar imágenes de galería.

**Independent Test**: Acceder a `/panel/catalogo/[id]`, sección Medios, subir imagen con alt_text, reordenar, marcar portada, eliminar.

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create `MediaUploadDialog` component in `src/features/promociones/components/media-upload-dialog.tsx`
- [ ] T011 [P] [US1] Create `MediaPreview` wrapper component in `src/features/promociones/components/media-preview.tsx`
- [ ] T012 [US1] Create `MediaGallery` client component (galería + drag & drop + portada + eliminar) in `src/features/promociones/components/media-gallery.tsx`
- [ ] T013 [US1] Integrate `MediaGallery` into `app/(auth)/panel/catalogo/[id]/page.tsx` as new section
- [ ] T014 [US1] Update page to load existing media assets and pass to `MediaGallery`

**Checkpoint**: User Story 1 fully functional — images can be uploaded, reordered, cover set, and deleted.

---

## Phase 4: User Story 2 — Gestionar planos (Priority: P1)

**Goal**: El operador puede subir y gestionar planos en sección separada.

**Independent Test**: Subir un plano, verificar que aparece en sección separada de la galería.

### Implementation for User Story 2

- [ ] T015 [US2] Add planos section to `MediaGallery` component (separate from galería) in `src/features/promociones/components/media-gallery.tsx`
- [ ] T016 [US2] Update upload dialog to support kind selection (IMAGE_GALLERY vs PLAN) in `src/features/promociones/components/media-upload-dialog.tsx`
- [ ] T017 [US2] Ensure planos cannot be marked as cover (only IMAGE_GALLERY) in `src/features/promociones/components/media-gallery.tsx`

**Checkpoint**: Planos se suben y gestionan en sección separada. Kind restriction funciona.

---

## Phase 5: User Story 3 — Bloqueo de publicación (Priority: P2)

**Goal**: La publicación se bloquea si faltan medios o alt_text.

**Independent Test**: Intentar publicar sin imágenes (bloqueo), con imagen sin alt_text (bloqueo).

### Implementation for User Story 3

- [ ] T018 [US3] Integrate `validateMediaForPublish` check into publish flow in `app/(auth)/panel/catalogo/[id]/page.tsx`
- [ ] T019 [US3] Add validation in route handler `app/api/internal/promociones/[id]/route.ts` — reject PUBLISHED if media invalid
- [ ] T020 [US3] Add error display for publish blocking in `src/features/promociones/components/promocion-form.tsx`

**Checkpoint**: Publish blocked when media is invalid. Clear error messages.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, cleanup, and verification.

- [ ] T021 Run `pnpm vitest run --reporter=dot` and verify all tests pass
- [ ] T022 Run `pnpm typecheck` and fix any type errors
- [ ] T023 Run `pnpm lint` on modified files and fix any lint errors
- [ ] T024 Run quickstart.md validation scenarios manually
- [ ] T025 Code cleanup — remove unused imports, verify no `any` types, check sonarjs complexity

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (builds on MediaGallery component)
- **Phase 5 (US3)**: Depends on Phase 3 (integrates validation)
- **Phase 6 (Polish)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Core media gallery — no story dependencies
- **US2 (P1)**: Planos — modifies MediaGallery component from US1
- **US3 (P2)**: Publish blocking — integrates validation from Phase 2

### Parallel Opportunities

- T010-T011 (MediaUploadDialog + MediaPreview) can run in parallel
- T005-T009 (server actions) have sequential dependency (same file)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T009)
3. Complete Phase 3: User Story 1 (T010-T014)
4. **STOP and VALIDATE**: Test image upload/reorder/cover/delete independently
5. Continue to US2, US3

### Incremental Delivery

1. Setup + Foundational → Server actions + Zod ready
2. US1 → Basic gallery works → MVP!
3. US2 → Planos added
4. US3 → Publish validation added
5. Polish → Verify all

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- TDD: Tests written before implementation in Phase 2 (validation + operations)
- MediaService ya existe (F006) — se consume, no se modifica
- @dnd-kit/sortable ya instalado (F012) — se reutiliza para drag & drop
- Todas las server actions usan repositorio context-aware con SET LOCAL
