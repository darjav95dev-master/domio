# Tasks: media-service-r2

**Input**: Design documents from `specs/005-media-service-r2/`

**Prerequisites**: plan.md (tech stack, structure), spec.md (user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: TDD required per constitution.md §3. Every implementation task has a preceding RED test task.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths in descriptions

---

## Phase 1: Setup (Dependencies + Infrastructure)

**Purpose**: Install packages, create env validation, types, and R2 client singleton — shared by all user stories.

- [ ] T001 Install dependencies: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` via pnpm
- [ ] T002 [P] Create R2 env validation in `src/infrastructure/media/env.ts` following pattern of `src/infrastructure/tenant/env.ts` — validate `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- [ ] T003 [P] Create service types in `src/infrastructure/media/types.ts` — `UploadInput`, `TransformOptions`, `MediaAssetRecord`
- [ ] T004 [P] Create R2 S3Client singleton in `src/infrastructure/media/r2-client.ts` — configured with R2 endpoint, region `auto`, credentials from validated env

**Checkpoint**: Core dependencies and infrastructure ready — MediaService skeleton can be built.

---

## Phase 2: Foundational (MediaService Skeleton + Test Infrastructure)

**Purpose**: Create the MediaService class skeleton and test scaffolding. Blocks all user stories.

- [ ] T005 Create MediaService skeleton in `src/infrastructure/media/media.service.ts` — class with constructor receiving `tenantId` and each method (uploadImage, signedReadUrl, getPublicUrl, reorderGallery, setCover, delete) as stubs throwing "Not implemented"
- [ ] T006 [P] Create `tests/unit/media/media.service.test.ts` with test scaffolding — mock S3Client, in-memory Drizzle DB, describe blocks for each method
- [ ] T007 [P] Create `tests/integration/media/upload.test.ts` with test scaffolding — HTTP test client, FormData helpers, auth mock
- [ ] T008 [P] Create `tests/unit/media/env.test.ts` — test env validation rejects missing/invalid vars and accepts valid ones

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Upload Image from Backoffice (Priority: P1) 🎯 MVP

**Goal**: Operator uploads an image via `POST /api/internal/media/upload`, system validates, stores in R2, persists `media_assets` record.

**Independent Test**: `POST` valid multipart → 201 with asset metadata; missing alt_text → 422; file > 10MB → 413.

### Tests for User Story 1 (write FIRST, ensure FAIL) ⚠️

- [ ] T009 [US1] Write failing unit tests for `uploadImage` in `tests/unit/media/media.service.test.ts` — covers: valid upload creates record, rejects empty alt_text before R2 call, rejects file > 10MB, rejects unsupported MIME type, generates unique r2_key preserving extension
- [ ] T010 [US1] Write failing integration tests for upload endpoint in `tests/integration/media/upload.test.ts` — covers: 201 with valid FormData, 422 on missing alt_text, 413 on oversized file, 422 on bad MIME type, 401 on missing auth

### Implementation for User Story 1

- [ ] T011 [US1] Implement `uploadImage` in `src/infrastructure/media/media.service.ts` — validate UploadInput (alt_text, MIME type, size, kind), generate UUID-based r2_key, PutObjectCommand to R2, INSERT into `media_assets` via Drizzle with `SET LOCAL app.tenant_id`
- [ ] T012 [US1] Implement `POST /api/internal/media/upload` Route Handler in `app/api/internal/media/upload/route.ts` — parse FormData, extract fields, delegate to MediaService, return 201 with asset JSON or structured error

**Checkpoint**: Upload flow end-to-end functional — image stored in R2, record in DB, tests green.

---

## Phase 4: User Story 2 - View Image via MediaImage (Priority: P1)

**Goal**: MediaImage component renders images from R2-backed URLs; fallback gradient activates on load failure.

**Independent Test**: Provide valid R2 public URL to MediaImage → image renders; simulate broken URL → fallback gradient displays.

### Tests for User Story 2 (write FIRST, ensure FAIL) ⚠️

- [ ] T013 [US2] Write failing unit test for `getPublicUrl` in `tests/unit/media/media.service.test.ts` — generates public URL from r2_key using R2_PUBLIC_URL base, URL is well-formed

### Implementation for User Story 2

- [ ] T014 [US2] Implement `getPublicUrl` in `src/infrastructure/media/media.service.ts` — returns `${R2_PUBLIC_URL}/${r2_key}` for IMAGE_GALLERY kind
- [ ] T015 [US2] Configure `next.config.ts` with R2 remote pattern for `next/image` — allow `R2_PUBLIC_URL` hostname, no width/height restrictions
- [ ] T016 [US2] Verify existing `MediaImage` component (`src/shared/components/media-image.tsx`) works with R2 URLs — no code changes needed (component already handles any src); write verification test in `tests/shared/components/media-image.test.tsx` proving R2 URL renders and fallback works

**Checkpoint**: Images uploaded via US1 display correctly; broken images show fallback gradient.

---

## Phase 5: User Story 6 - Signed URLs for Documents (Priority: P3)

**Goal**: Generate time-limited signed URLs for private documents (kind: DOCUMENT, PLAN). Public images use unsigned public URLs.

**Independent Test**: Generate signed URL → access within TTL succeeds → access after TTL fails.

### Tests for User Story 6 (write FIRST, ensure FAIL) ⚠️

- [ ] T017 [US6] Write failing unit test for `signedReadUrl` in `tests/unit/media/media.service.test.ts` — generates signed URL for DOCUMENT kind with correct TTL, returns public URL for IMAGE_GALLERY kind, TTL defaults to 3600s

### Implementation for User Story 6

- [ ] T018 [US6] Implement `signedReadUrl` in `src/infrastructure/media/media.service.ts` — use `@aws-sdk/s3-request-presigner` `getSignedUrl` with `GetObjectCommand`, accept optional `ttlSeconds` and `TransformOptions`, return public URL for IMAGE_GALLERY

**Checkpoint**: Documents accessible via signed URLs within TTL; gallery images use public URLs.

---

## Phase 6: User Story 3 - Delete Media Asset (Priority: P2)

**Goal**: Operator deletes an asset; system removes from R2 and database.

**Independent Test**: Create asset → delete → verify R2 object gone + DB record gone.

### Tests for User Story 3 (write FIRST, ensure FAIL) ⚠️

- [ ] T019 [US3] Write failing unit tests for `delete` in `tests/unit/media/media.service.test.ts` — deletes R2 object and DB record, handles non-existent asset (404), clears is_cover if deleted asset was cover

### Implementation for User Story 3

- [ ] T020 [US3] Implement `delete` in `src/infrastructure/media/media.service.ts` — DeleteObjectCommand to R2, DELETE from `media_assets` WHERE id = assetId AND tenant_id matches, handle cascade (unset is_cover on other assets if needed)

---

## Phase 7: User Story 4 & 5 - Reorder Gallery + Set Cover (Priority: P2)

**Goal**: Operator reorders gallery images and designates cover image; both operations are atomic.

**Independent Test**: Create 3 assets → reorder to [3,1,2] → verify sort_order matches; set asset B as cover → verify exactly one is_cover = true.

### Tests for User Stories 4 & 5 (write FIRST, ensure FAIL) ⚠️

- [ ] T021 [P] [US4] Write failing unit tests for `reorderGallery` in `tests/unit/media/media.service.test.ts` — updates all sort_order values atomically for owner, empty array is no-op, rejects invalid asset IDs
- [ ] T022 [P] [US5] Write failing unit tests for `setCover` in `tests/unit/media/media.service.test.ts` — sets is_cover=true for target and false for others atomically, idempotent (same image twice), rejects asset not belonging to owner

### Implementation for User Stories 4 & 5

- [ ] T023 [US4] Implement `reorderGallery` in `src/infrastructure/media/media.service.ts` — within a single Drizzle transaction, UPDATE sort_order for each asset in orderedAssetIds with index-based values
- [ ] T024 [US5] Implement `setCover` in `src/infrastructure/media/media.service.ts` — within a single Drizzle transaction, UPDATE is_cover to false for all assets of owner, then UPDATE is_cover to true for target assetId

**Checkpoint**: Gallery reordering and cover selection work atomically.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, validation, and quality gates.

- [ ] T025 Run `pnpm vitest run --reporter=dot` — all unit + integration tests green
- [ ] T026 Run `pnpm typecheck` — TypeScript strict, no errors
- [ ] T027 Run `pnpm build` — production build succeeds
- [ ] T028 Run quickstart.md validation scenarios end-to-end
- [ ] T029 Verify `.env.example` declares all R2 env vars (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories.
- **Phase 3 (US1 · Upload P1)**: Depends on Phase 2. 🎯 MVP.
- **Phase 4 (US2 · View P1)**: Depends on Phase 2 + US1 (needs uploaded assets to verify rendering).
- **Phase 5 (US6 · Signed URLs P3)**: Depends on Phase 2. Can run in parallel with US1, US2.
- **Phase 6 (US3 · Delete P2)**: Depends on Phase 2 + US1 (needs uploaded assets to delete).
- **Phase 7 (US4+5 · Reorder+Cover P2)**: Depends on Phase 2 + US1 (needs uploaded assets).
- **Phase 8 (Polish)**: Depends on all desired phases complete.

### User Story Dependencies

- **US1 (P1)**: Independent — can start after Phase 2.
- **US2 (P1)**: Lightweight — reuses existing MediaImage, primarily config + public URL method.
- **US6 (P3)**: Independent — signed URL logic is self-contained.
- **US3 (P2)**: Depends on US1 (needs MediaService.uploadImage to create assets to delete).
- **US4 (P2)**: Depends on US1 (needs assets to reorder).
- **US5 (P2)**: Depends on US1 (needs assets to set cover).

### Parallel Opportunities

- T002, T003, T004 (Phase 1) all [P] — different files
- T006, T007, T008 (Phase 2) all [P] — test scaffolding in separate files
- T021, T022 (Phase 7 tests) both [P] — different test cases
- US6 (Phase 5) can run in parallel with US2 (Phase 4)
- US3, US4, US5 (Phases 6-7) can run in parallel once US1 is done

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1: Setup → Phase 2: Foundational
2. Phase 3: US1 (Upload) → **STOP, VALIDATE**: upload flow works end-to-end
3. Phase 4: US2 (View via MediaImage) → **STOP, VALIDATE**: images render
4. **MVP delivered**: Upload + View = catalog can show images 🎯

### Incremental Delivery

1. MVP: US1 + US2 → upload + view working
2. + US6: Signed URLs for documents
3. + US3: Delete capability
4. + US4+5: Reorder + cover selection
5. + Polish: Full suite green, build passes

---

## Notes

- **All tasks are DOMAIN (backend-developer)**: No UI changes — MediaImage is reused as-is from F003.
- TDD enforced: Each implementation task has a preceding RED test task. Tests must FAIL before implementation.
- `src/infrastructure/db/schema/media-assets.ts` already exists (F002) — no schema changes needed.
- `src/shared/components/media-image.tsx` already exists (F003) — verify, do not modify.
- R2 credentials never committed — `.env.local` only. `.env.example` already declares the vars.
- For `SET LOCAL app.tenant_id` inside transactions: follow the pattern in `src/infrastructure/db/repositories/` — use `db.transaction(async (tx) => { await tx.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`); ... })`.
