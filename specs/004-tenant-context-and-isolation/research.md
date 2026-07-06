# Research: Tenant Context and Isolation

## Decision 1: SET LOCAL Mechanism

**Decision**: Use Drizzle's `db.transaction()` API combined with raw SQL `SET LOCAL` via `tx.execute(sql\`SET LOCAL app.current_tenant_id = '${tenantId}'\`)`.

**Rationale**: 
- Neon uses PgBouncer in transaction pooling mode. `SET` without `LOCAL` persists beyond the transaction and leaks context to the next request on the same connection.
- `SET LOCAL` scopes the variable to the current transaction only. When the transaction commits or rolls back, the variable is discarded.
- Drizzle's `db.transaction()` provides the transaction boundary. The `SET LOCAL` call is the first operation inside the callback.
- This pattern is mandated by architecture.md §2.2 and verified by the isolation test suite.

**Alternatives considered**:
- `SET` (global) — rejected: leaks context under PgBouncer pooling.
- `SET SESSION` — same problem as global SET under transaction pooling.
- Per-query WHERE clause (`WHERE tenant_id = X`) — rejected: violates RLS design; RLS is the authoritative filter.
- Connection-level variable — rejected: not compatible with serverless (Vercel) where connections are ephemeral.

## Decision 2: Middleware Resolution Strategy

**Decision**: Use Next.js middleware (`middleware.ts`) + host-based routing to determine context type, then attach the resolved context to the request via `AsyncLocalStorage` or a request-scoped container.

**Rationale**:
- Next.js middleware runs at the Edge before the request hits the application. It can inspect `host` header and URL path.
- `domio.com` → `PublicContext`
- `panel.domio.com` → check Auth.js session → `AuthenticatedContext`
- `/api/v1/*` → extract API key header → `ApiKeyContext`
- `AsyncLocalStorage` (Node.js built-in) provides request-scoped storage without passing context through every function argument. Aligns with Next.js and serverless runtime.
- Context is resolved **once per request** in middleware, then consumed by repositories.

**Alternatives considered**:
- React Context — rejected: not available in server components for database access layer.
- Thread-local storage — rejected: Node.js is single-threaded; `AsyncLocalStorage` is the correct async-aware primitive.
- Passing context as function argument everywhere — works but clutters signatures; `AsyncLocalStorage` + repository constructor injection is cleaner.

## Decision 3: Context Propagation via Dependency Injection

**Decision**: `TenantContext` is injected into `TenantAwareRepository` via constructor. The middleware stores the resolved context in `AsyncLocalStorage`, and a factory/helper retrieves it for instantiation.

**Rationale**:
- Repositories are instantiated per-request (or per-operation). The constructor receives the context.
- The application code (route handlers, server actions) does not read the context from the request directly — it instantiates the repository with the context retrieved from the store.
- This keeps the "never read from the client" rule enforceable: only the middleware touches the request to extract auth/session headers.

**Alternatives considered**:
- Global singleton context — rejected: leaks between requests in serverless.
- Reading auth headers inside each repository — rejected: violates single-responsibility; context resolution should happen once.

## Decision 4: Testing Strategy

**Decision**: Create `tests/isolation/` suite using Vitest with a real PostgreSQL test database (or Neon branch). Two synthetic tenants are created in `beforeAll`, seeded with fixtures, and tested with concurrent operations.

**Rationale**:
- Unit tests (mocking `TenantContext` and `TenantAwareRepository`) verify the class contracts and SET LOCAL behavior.
- Integration/isolation tests use a real database with RLS active to prove multi-tenancy works end-to-end.
- The isolation suite is blocking in CI — if it fails, the feature cannot merge.

**Alternatives considered**:
- Pure unit tests with mocks — rejected: cannot verify RLS policy enforcement.
- SQLite for isolation tests — rejected: SQLite does not support RLS; must use PostgreSQL.
- Shared test database — risky; each test run must create unique tenants to avoid collisions.

## Decision 5: Public Tenant ID

**Decision**: The public tenant ID (used by `PublicContext`) is configured via environment variable `PUBLIC_TENANT_ID` and validated at application startup.

**Rationale**:
- The public tenant is the single active tenant today. Hardcoding it would make future multi-tenancy harder.
- Environment variable allows switching in development, staging, and production without code changes.
- Validation at startup ensures the tenant exists before accepting traffic.

**Alternatives considered**:
- Hardcoded UUID constant — rejected: not portable between environments.
- Database query on first request — rejected: adds latency to the first public request; pre-resolution at startup is better.
