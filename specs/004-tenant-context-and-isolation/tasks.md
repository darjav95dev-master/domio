# Tasks: Tenant Context and Isolation

**Input**: Design documents from `specs/004-tenant-context-and-isolation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — TDD required by constitution.md §3 for all business logic.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths in all descriptions

---

## Phase 1: Setup

**Purpose**: Directory structure and environment validation

- [ ] T001 Create directory structure: `src/infrastructure/tenant/`, `tests/isolation/`, `tests/unit/tenant/`
- [ ] T002 Add `PUBLIC_TENANT_ID` to `.env.example` with documentation comment
- [ ] T003 [P] Add environment validation for `PUBLIC_TENANT_ID` (must be valid UUID) in `src/infrastructure/tenant/env.ts`

---

## Phase 2: Foundational — TenantContext & TenantAwareRepository

**Purpose**: Abstract base classes that ALL user stories depend on. Must complete before US1–US5.

**⚠️ BLOCKING**: No user story work can begin until this phase is done.

- [ ] T004 [P] Implement `TenantContext` abstract class with `withTransaction` method signature in `src/infrastructure/tenant/TenantContext.ts`
- [ ] T005 [P] Implement `TenantAwareRepository` abstract class with constructor injection of `TenantContext` and `withTransaction` protected method in `src/infrastructure/db/repositories/TenantAwareRepository.ts`

---

## Phase 3: User Story 1 — Tenant isolation enforced at data layer (P1) 🎯 MVP

**Goal**: Every DB operation carries correct tenant context via `SET LOCAL app.current_tenant_id`. Two tenants never see each other's data.

**Independent Test**: `withTransaction` sets `SET LOCAL` correctly; RLS filters per tenant.

- [ ] T006 [US1] Write unit test for `TenantAwareRepository.withTransaction` — verifies `SET LOCAL app.current_tenant_id` is executed inside transaction in `tests/unit/tenant/tenant-aware-repository.test.ts`
- [ ] T007 [US1] Implement `withTransaction` method body: opens `db.transaction()`, executes `SET LOCAL app.current_tenant_id`, runs callback in `src/infrastructure/db/repositories/TenantAwareRepository.ts`
- [ ] T008 [US1] Write unit test for `TenantContext.withTransaction` — verifies transaction boundary and tenant_id propagation in `tests/unit/tenant/tenant-context.test.ts`
- [ ] T009 [US1] Implement `TenantContext.withTransaction` with `SET LOCAL app.current_tenant_id` in `src/infrastructure/tenant/TenantContext.ts`
- [ ] T010 [US1] Verify: `pnpm vitest --run tests/unit/tenant/` — all tests GREEN

---

## Phase 4: User Story 2 — PublicContext for public visitors (P2)

**Goal**: `domio.com` visitors see only `status='PUBLISHED'` promociones. No session required.

**Independent Test**: Seed one PUBLISHED and one DRAFT promoción; PublicContext returns only PUBLISHED.

- [ ] T011 [US2] Write unit test for `PublicContext` — verifies `PUBLIC_TENANT_ID` resolution, `resolveFilters()` returns `{ status: 'PUBLISHED' }`, and `withTransaction` sets correct tenant in `tests/unit/tenant/public-context.test.ts`
- [ ] T012 [US2] Implement `PublicContext` class extending `TenantContext` with `resolveFilters(): { status: 'PUBLISHED' }` in `src/infrastructure/tenant/PublicContext.ts`
- [ ] T013 [US2] Write integration test: seed PUBLISHED + DRAFT promociones, verify PublicContext query returns only PUBLISHED in `tests/unit/tenant/public-context.test.ts`
- [ ] T014 [US2] Verify: `pnpm vitest --run tests/unit/tenant/public-context.test.ts` — GREEN

---

## Phase 5: User Story 3 — AuthenticatedContext for backoffice (P3)

**Goal**: `panel.domio.com` users get `tenant_id` + `user_id` + `role` from Auth.js session. Both `SET LOCAL` variables are set.

**Independent Test**: Mock session → AuthenticatedContext sets both `app.current_tenant_id` and `app.current_user_id`.

- [ ] T015 [US3] Write unit test for `AuthenticatedContext` — verifies session extraction (tenant_id, user_id, role), `withTransaction` sets both `app.current_tenant_id` and `app.current_user_id`, `resolveFilters()` returns `{}` in `tests/unit/tenant/authenticated-context.test.ts`
- [ ] T016 [US3] Implement `AuthenticatedContext` class extending `TenantContext` with `userId` and `role` fields, setting both `SET LOCAL app.current_tenant_id` and `SET LOCAL app.current_user_id` in `src/infrastructure/tenant/AuthenticatedContext.ts`
- [ ] T017 [US3] Verify: `pnpm vitest --run tests/unit/tenant/authenticated-context.test.ts` — GREEN

---

## Phase 6: User Story 4 — ApiKeyContext for API consumers (P4)

**Goal**: `/api/v1/*` consumers get filtered catalog: `kind='portfolio'` + `status='PUBLISHED'` enforced at repository level.

**Independent Test**: Request with API key explicitly asking for `kind='external'` → response empty.

- [ ] T018 [US4] Write unit test for `ApiKeyContext` — verifies API key resolution, `resolveFilters()` returns `{ kind: 'portfolio', status: 'PUBLISHED' }`, and consumer cannot override filters in `tests/unit/tenant/api-key-context.test.ts`
- [ ] T019 [US4] Implement `ApiKeyContext` class extending `TenantContext` with `apiKeyId` field and mandatory filter enforcement in `src/infrastructure/tenant/ApiKeyContext.ts`
- [ ] T020 [US4] Verify: `pnpm vitest --run tests/unit/tenant/api-key-context.test.ts` — GREEN

---

## Phase 7: User Story 5 — Full isolation test suite (P5) 🛡️

**Goal**: Two synthetic tenants operate concurrently on `promociones`, `leads`, and `tipologías` — zero cross-tenant data visibility. CI-blocking.

**Independent Test**: Run `tests/isolation/` standalone → all pass.

- [ ] T021 [US5] Write `tests/isolation/setup.ts`: create two synthetic tenants, seed fixtures (promociones, leads, tipologías per tenant), provide helper to create TenantContext for each in `tests/isolation/setup.ts`
- [ ] T022 [US5] Write isolation test: Tenant A queries promociones → returns only Tenant A's rows in `tests/isolation/tenant-isolation.test.ts`
- [ ] T023 [US5] Write isolation test: Tenant A writes a lead → Tenant B queries leads → does not see Tenant A's lead in `tests/isolation/tenant-isolation.test.ts`
- [ ] T024 [US5] Write isolation test: concurrent Tenant A and Tenant B write operations → each tenant's row count matches its own seed data in `tests/isolation/tenant-isolation.test.ts`
- [ ] T025 [US5] Write isolation test: `SET` (without LOCAL) is NOT used anywhere in transaction paths → grep-based assertion in `tests/isolation/tenant-isolation.test.ts`
- [ ] T026 [US5] Verify: `pnpm vitest --run tests/isolation/` — ALL GREEN, zero cross-tenant visibility

---

## Phase 8: Middleware & Polish

**Purpose**: Wire contexts into Next.js request lifecycle and enforce cross-cutting rules.

- [ ] T027 Implement host-based context resolution middleware: `domio.com` → PublicContext, `panel.domio.com` → AuthenticatedContext (mock session), `/api/v1/*` → ApiKeyContext (mock key lookup) in `src/infrastructure/tenant/context-middleware.ts`
- [ ] T028 Write unit test for middleware — verifies correct context type resolved per host/path in `tests/unit/tenant/context-middleware.test.ts`
- [ ] T029 Add CI grep check: no bare `SET ` (without `LOCAL`) outside `src/infrastructure/` in `.github/workflows/ci.yml` or equivalent
- [ ] T030 Add CI grep check: no raw `db.select/insert/update/delete` outside `src/infrastructure/db/repositories/` and `src/infrastructure/tenant/`
- [ ] T031 Run full quality suite: `pnpm test:run && pnpm test:coverage` — verify ≥80% coverage on tenant layer
- [ ] T032 Run `pnpm lint && pnpm typecheck` — zero errors

---

## Dependencies

```
Phase 1 (Setup)
  └─ Phase 2 (Foundational: TenantContext + TenantAwareRepository)
       ├─ Phase 3 (US1: SET LOCAL verification) ──┐
       ├─ Phase 4 (US2: PublicContext) ────────────┤
       ├─ Phase 5 (US3: AuthenticatedContext) ─────┤ All context types ready
       ├─ Phase 6 (US4: ApiKeyContext) ────────────┘
       └─ Phase 7 (US5: Full isolation suite) ← depends on US1–US4
            └─ Phase 8 (Middleware + Polish)
```

- **US2, US3, US4**: Independent of each other — can run in parallel after Phase 2
- **US5**: Depends on all context types being implemented (US2–US4) + TenantAwareRepository (US1)
- **Phase 8**: Depends on US5 passing (isolation verified)

## Parallel Execution Opportunities

- T002, T003 (Setup tasks)
- T004, T005 (Foundational base classes — different files)
- T006, T008 (Unit tests for different classes)
- US2 (T011–T014), US3 (T015–T017), US4 (T018–T020) — all independent after Phase 2

## Implementation Strategy

### MVP (Phase 1–3)
Deliver `TenantContext` + `TenantAwareRepository` with unit-tested `SET LOCAL` behavior. This proves the mechanism works and unlocks all context types.

### Incremental Delivery
1. **MVP** → TenantAwareRepository with SET LOCAL verified
2. **+US2** → Public catalog visitors see only published content
3. **+US3** → Backoffice users get authenticated context
4. **+US4** → API consumers get filtered access
5. **+US5** → Full isolation verified, CI-blocking
6. **+Phase 8** → Middleware wired, cross-cutting rules enforced

---

## Summary

| Phase | User Story | Tasks | Status |
|-------|-----------|-------|--------|
| 1 | Setup | T001–T003 | ⬜ |
| 2 | Foundational | T004–T005 | ⬜ |
| 3 | US1 (P1) — SET LOCAL | T006–T010 | ⬜ |
| 4 | US2 (P2) — PublicContext | T011–T014 | ⬜ |
| 5 | US3 (P3) — AuthenticatedContext | T015–T017 | ⬜ |
| 6 | US4 (P4) — ApiKeyContext | T018–T020 | ⬜ |
| 7 | US5 (P5) — Isolation suite | T021–T026 | ⬜ |
| 8 | Middleware & Polish | T027–T032 | ⬜ |

**Total**: 32 tasks across 8 phases
