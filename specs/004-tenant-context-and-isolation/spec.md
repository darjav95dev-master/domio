# Feature Specification: Tenant Context and Isolation

**Feature Branch**: `feature/004-tenant-context-and-isolation`
**Created**: 2026-07-06
**Status**: Draft
**Input**: Implementar TenantContext (Public, Authenticated, ApiKey), TenantAwareRepository con SET LOCAL, middleware de propagación, tests de aislamiento con dos tenants.

## User Scenarios & Testing

### User Story 1 — Tenant isolation enforced at data layer (P1)

Every database operation within a request carries the correct tenant context via `SET LOCAL app.current_tenant_id`. When two requests from different tenants execute concurrently, neither sees the other's data.

**Why this priority**: Foundational invariant of the multi-tenant architecture. Without it, data leaks are possible between tenants.

**Independent Test**: Run `tests/isolation/` with two synthetic tenants performing concurrent operations on `promociones`, `leads`, and `tipologías` — verify zero cross-tenant data visibility.

**Acceptance Scenarios**:
1. **Given** Tenant A and Tenant B each have their own promociones, **When** Tenant A queries all promociones, **Then** only Tenant A's promociones are returned.
2. **Given** a `TenantAwareRepository.withTransaction()` call, **When** the transaction executes `SET LOCAL app.current_tenant_id`, **Then** all queries within that transaction are filtered by RLS to that tenant.

---

### User Story 2 — Public visitors see only published catalog content (P2)

A visitor browsing `domio.com` without authentication sees only promociones with `status='PUBLISHED'`. Draft, reserved, sold, rented, and withdrawn promociones are invisible via the `PublicContext`.

**Why this priority**: The public catalog is the primary commercial surface. Exposing non-published content breaks SEO and the editorial narrative.

**Independent Test**: Seed one published and one draft promoción; verify `PublicContext` queries return only the published one.

**Acceptance Scenarios**:
1. **Given** a promoción with `status='DRAFT'`, **When** `PublicContext` resolves and queries the catalog, **Then** the draft promoción is excluded.
2. **Given** a promoción with `status='PUBLISHED'`, **When** `PublicContext` resolves, **Then** the promoción is visible.

---

### User Story 3 — Backoffice users get authenticated tenant context (P3)

Users authenticated via Auth.js v5 on `panel.domio.com` have their `tenant_id`, `user_id`, and `role` propagated into every repository operation via `AuthenticatedContext`.

**Why this priority**: The backoffice depends on session-based context. Without it, no authenticated feature works.

**Independent Test**: Simulate a session with known `tenant_id` and `user_id`; verify `AuthenticatedContext` sets both `SET LOCAL app.current_tenant_id` and `SET LOCAL app.current_user_id`.

**Acceptance Scenarios**:
1. **Given** a valid Auth.js session with `tenant_id = X` and `user_id = Y`, **When** middleware resolves `AuthenticatedContext`, **Then** every repository call within that request executes `SET LOCAL app.current_tenant_id = X` and `SET LOCAL app.current_user_id = Y`.

---

### User Story 4 — API consumers get filtered, rate-limited access (P4)

A system authenticating via API key on `/api/v1/*` gets an `ApiKeyContext` that enforces `kind='portfolio'` and `status='PUBLISHED'` — regardless of query parameters.

**Why this priority**: The API surface is the integration point with external systems. Incorrect filtering leaks internal data.

**Independent Test**: Send a request with a valid API key explicitly asking for `kind='external'`; verify the response contains only `kind='portfolio'`.

**Acceptance Scenarios**:
1. **Given** a valid API key, **When** the consumer requests all promociones unfiltered, **Then** the `ApiKeyContext` applies `kind='portfolio'` and `status='PUBLISHED'`.
2. **Given** a valid API key, **When** the consumer explicitly queries `kind='external'`, **Then** the response is empty (the context filter overrides).

---

### User Story 5 — Concurrent tenant access is provably isolated (P5)

The `tests/isolation/` suite creates two synthetic tenants, seeds data in each, and executes concurrent reads and writes. It verifies zero cross-tenant data visibility. This suite is blocking in CI.

**Why this priority**: Architectural proof that the multi-tenant DNA works. Prevents regression across all future features.

**Independent Test**: Run `tests/isolation/` as a standalone suite — must pass green in CI.

**Acceptance Scenarios**:
1. **Given** Tenant A and Tenant B seeded with different promociones, **When** Tenant A queries all promociones, **Then** result set matches only Tenant A's seed data.
2. **Given** Tenant A writing a new lead, **When** Tenant B queries leads, **Then** Tenant B does not see the lead from Tenant A.
3. **Given** two concurrent write operations from different tenants on the same table, **When** both complete, **Then** each tenant's row count reflects only its own data.

---

### Edge Cases

- What happens when no tenant can be resolved by middleware? → Fail fast with clear error (401 for missing auth, 500 for misconfigured tenant).
- What happens under PgBouncer transaction pooling with concurrent requests? → Each transaction establishes its own `SET LOCAL` scope; pooled connections never leak context between requests.
- What happens if `SET` (without `LOCAL`) is attempted? → The repository pattern prevents this; a grep-based CI check bans bare `SET ` usage.
- What happens when `SET LOCAL` is used but the transaction rolls back? → Context is discarded with the transaction; no lingering state on the connection.
- What happens if the Auth.js session is expired or tampered with? → Middleware must resolve to an error, not fall back to `PublicContext`.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a `TenantContext` base class/interface with a `withTransaction` method that opens a DB transaction, executes `SET LOCAL app.current_tenant_id`, runs the callback, and commits/rolls back.
- **FR-002**: System MUST implement `PublicContext` — resolved on `domio.com`, no session, filters all catalog reads by `status='PUBLISHED'`.
- **FR-003**: System MUST implement `AuthenticatedContext` — resolved on `panel.domio.com` from Auth.js session, carries `tenant_id` + `user_id` + `role`, executes `SET LOCAL app.current_tenant_id` and `SET LOCAL app.current_user_id`.
- **FR-004**: System MUST implement `ApiKeyContext` — resolved on `/api/v1/*` from API key header, carries `api_key_id` + `tenant_id`, enforces `kind='portfolio'` + `status='PUBLISHED'` on all catalog reads.
- **FR-005**: System MUST provide a `TenantAwareRepository` abstract class that encapsulates `db.transaction(tx => { tx.execute(sql\`SET LOCAL ...\`); ... })` — application code never touches `SET LOCAL` directly.
- **FR-006**: System MUST forbid raw `db.select()`, `db.insert()`, etc. outside repository files. Enforceable via CI grep or ESLint rule.
- **FR-007**: System MUST provide middleware that resolves the correct `TenantContext` subtype once per request based on host + auth status.
- **FR-008**: The resolved `TenantContext` MUST be propagated via dependency injection — never read from the request object in arbitrary code paths.
- **FR-009**: System MUST include `tests/isolation/` suite with two synthetic tenants, concurrent operations, and zero cross-tenant visibility verification.
- **FR-010**: The isolation suite MUST be blocking in CI — any cross-tenant data visibility fails the build.

### Key Entities

- **TenantContext** (abstract): `withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>`. Sets `app.current_tenant_id` via `SET LOCAL` inside the transaction.
- **PublicContext** (extends TenantContext): Hardcoded public tenant ID. Applies `status='PUBLISHED'` on reads. No `user_id`.
- **AuthenticatedContext** (extends TenantContext): From Auth.js session. Carries `tenant_id`, `user_id`, `role`. Sets `app.current_tenant_id` + `app.current_user_id`.
- **ApiKeyContext** (extends TenantContext): From API key lookup. Carries `tenant_id`, `api_key_id`. Enforces `kind='portfolio'` + `status='PUBLISHED'`.
- **TenantAwareRepository** (abstract): Base for all domain repos. Receives `TenantContext` via constructor. Exposes `withTransaction` as the only DB access path.

## Success Criteria

- **SC-001**: `tests/isolation/` passes with two tenants on same tables — zero cross-tenant data visibility.
- **SC-002**: No bare `SET ` (without `LOCAL`) exists in codebase outside `TenantAwareRepository`. CI grep check passes.
- **SC-003**: No raw database queries exist outside `src/infrastructure/db/repositories/` or `src/infrastructure/tenant/`.
- **SC-004**: `PublicContext`, `AuthenticatedContext`, and `ApiKeyContext` resolve correctly from their respective surfaces and apply mandatory filters.
- **SC-005**: Test coverage ≥ 80% on files under `src/infrastructure/tenant/` and `TenantAwareRepository`.
- **SC-006**: Middleware resolves context once per request — no redundant DB lookups or session parsing per operation.

## Assumptions

- **F002** has already created tables with `tenant_id`, RLS policies, and composite indices. This feature consumes them; it does not modify schema.
- `AuthenticatedContext` resolution is testable with mock sessions — real Auth.js v5 integration is F005.
- `ApiKeyContext` resolution is testable with mock key lookup — real API key management is F016.
- The public tenant ID is a known constant (single active tenant's UUID) configured via environment variable.
- Concrete domain repositories (`PromocionRepository`, `LeadRepository`) are out of scope — built in F011, F014, etc.
- RLS policies (created in F002) filter by `app.current_tenant_id` and `app.current_user_id`. This feature sets those variables correctly; it does not redefine policies.
