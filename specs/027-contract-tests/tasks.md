# Tasks: Contract Tests

**Input**: Design documents from `/specs/027-contract-tests/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: This feature IS testing — all tasks produce test code and snapshot infrastructure.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create directory structure

- [ ] T001 Install `@asteasolutions/zod-to-openapi` dependency: `pnpm add @asteasolutions/zod-to-openapi`
- [ ] T002 Create directory structure: `tests/contract/v1/snapshots/`, `src/features/api-public/openapi/`, `app/api/internal/docs/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Snapshot serialization utility and OpenAPI generator that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create `src/features/api-public/openapi/snapshot-serializer.ts` — utility that serializes a zod schema to JSON (preserving structure: fields, types, optional/required, nested objects). Exports `serializeSchema(schema: z.ZodType): object`.
- [ ] T004 Create `src/features/api-public/openapi/generate-openapi.ts` — OpenAPI 3.0 spec generator using `@asteasolutions/zod-to-openapi`. Registers `promocionResponseSchema` and `leadInstitutionalSchema`, defines paths for GET /api/v1/promociones and POST /api/v1/leads/institutional. Exports `generateOpenAPISpec(): object`.

**Checkpoint**: Foundation ready — snapshot serializer and OpenAPI generator available

---

## Phase 3: User Story 1 — Snapshot de schemas y test de no-divergencia (Priority: P1) 🎯 MVP

**Goal**: Implement snapshot-based divergence detection for API v1 schemas

**Independent Test**: `pnpm test:contract` passes with current snapshots. Modifying a schema causes test failure.

### Implementation for User Story 1

- [ ] T005 [US1] Generate initial snapshots: create `tests/contract/v1/snapshots/promocion-response.schema.json` by serializing `promocionResponseSchema` using the snapshot-serializer utility
- [ ] T006 [US1] Generate initial snapshots: create `tests/contract/v1/snapshots/lead-institutional.schema.json` by serializing `leadInstitutionalSchema`
- [ ] T007 [US1] Create snapshot divergence test in `tests/contract/v1/snapshot-divergence.contract.spec.ts` — imports both schemas, serializes them, compares against snapshots using `toMatchSnapshot()`. Test fails if any difference detected.
- [ ] T008 [US1] Amplify `tests/contract/v1/promocion-response.contract.spec.ts` — add snapshot comparison test that serializes current `promocionResponseSchema` and compares against `snapshots/promocion-response.schema.json`
- [ ] T009 [US1] Amplify `tests/contract/v1/lead-institutional.contract.spec.ts` — add snapshot comparison test that serializes current `leadInstitutionalSchema` and compares against `snapshots/lead-institutional.schema.json`

**Checkpoint**: Snapshot divergence detection works — any schema change causes test failure

---

## Phase 4: User Story 2 — OpenAPI autogenerado (Priority: P2)

**Goal**: Serve OpenAPI 3.0 spec from `/api/internal/docs` with authentication

**Independent Test**: GET /api/internal/docs with admin session returns valid OpenAPI spec. Without session returns 401.

### Implementation for User Story 2

- [ ] T010 [US2] Create `app/api/internal/docs/route.ts` — GET handler that calls `generateOpenAPISpec()`, verifies session with `getServerSession()`, returns 401 if unauthenticated, returns OpenAPI JSON with `Content-Type: application/json` if authenticated
- [ ] T011 [US2] Create OpenAPI validation test in `tests/contract/v1/openapi-validation.contract.spec.ts` — imports `generateOpenAPISpec()`, verifies the spec is valid OpenAPI 3.0 (has `openapi`, `info`, `paths` fields), verifies paths include `/api/v1/promociones` and `/api/v1/leads/institutional`

**Checkpoint**: OpenAPI endpoint serves valid spec with authentication

---

## Phase 5: User Story 3 — Contract tests de rate limiting (Priority: P3)

**Goal**: Verify rate limiting behavior via contract tests

**Independent Test**: `pnpm test:contract -- tests/contract/v1/rate-limit.contract.spec.ts` passes

### Implementation for User Story 3

- [ ] T012 [US3] Create `tests/contract/v1/rate-limit.contract.spec.ts` — tests that verify rate limiting contract: (a) endpoint CAN respond 429 when limit exceeded (mock rate limiter to return `allowed: false`), (b) endpoint responds normally when rate limiter allows, (c) test passes in degraded mode (no Redis configured)

**Checkpoint**: Rate limiting contract tests pass

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consumer mirror tests, script for manual snapshot updates, final validation

- [ ] T013 Create `tests/contract/v1/consumer-mirror.contract.spec.ts` — consumer perspective tests that make real HTTP requests to endpoints (using `fetch` with test API key), verify status codes, headers, and that response body validates against schemas
- [ ] T014 Create `scripts/update-contract-snapshots.ts` — helper script that regenerates all snapshots by importing schemas and writing JSON files. Can be run manually with `pnpm tsx scripts/update-contract-snapshots.ts`
- [ ] T015 Run full contract test suite: `pnpm test:contract` — verify all tests pass (snapshot divergence, OpenAPI validation, rate limiting, consumer mirror)
- [ ] T016 Verify quickstart.md scenarios all pass as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — installs deps and creates dirs
- **Foundational (Phase 2)**: Depends on Phase 1 — creates serializer and OpenAPI generator
- **US1 (Phase 3)**: Depends on Phase 2 (snapshot-serializer)
- **US2 (Phase 4)**: Depends on Phase 2 (generate-openapi)
- **US3 (Phase 5)**: Independent of Phase 2 (uses existing rate limiter)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — needs snapshot-serializer
- **US2 (P2)**: Can start after Phase 2 — needs generate-openapi
- **US3 (P3)**: Can start after Phase 1 — no dependency on Phase 2

### Within Each User Story

- Snapshot generation (T005, T006) before divergence test (T007)
- OpenAPI generator (T004) before endpoint (T010) before validation test (T011)

### Parallel Opportunities

- Phase 2: T003 and T004 can be created in parallel (different files)
- Phase 3: T005 and T006 can be generated in parallel (different snapshots)
- Phase 3: T008 and T009 can be amplified in parallel (different test files)
- Phase 4: T010 and T011 can be created in parallel (different files)
- Phase 6: T013 and T014 can be created in parallel (different files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install deps, create dirs)
2. Complete Phase 2: Foundational (snapshot-serializer)
3. Complete Phase 3: User Story 1 (snapshots + divergence test)
4. **STOP and VALIDATE**: `pnpm test:contract` passes, modify a schema and verify test fails
5. Continue with remaining stories

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 (snapshots + divergence) → Core contract protection
3. US2 (OpenAPI) → Documentation automation
4. US3 (rate limiting) → Rate limit contract verification
5. Polish → Consumer mirror tests, helper scripts, full validation

---

## Notes

- [P] tasks = different files, no dependencies — can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Snapshots are JSON files versioned in git (not ignored)
- `--update` flag of Vitest updates snapshots automatically
- OpenAPI generation happens at runtime (not build time)
- Consumer mirror tests require a test API key (created in beforeAll or from seed)
- Rate limit tests work in degraded mode (no Redis) or with real Redis
