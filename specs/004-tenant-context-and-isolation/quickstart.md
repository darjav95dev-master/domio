# Quickstart: Tenant Context and Isolation

## Prerequisites

- F002 (db-schema-and-migrations) deployed — all tables with `tenant_id` and RLS policies exist
- `.env.local` configured with `DATABASE_URL` and `PUBLIC_TENANT_ID`
- Database migrated (`pnpm db:migrate`) and seeded with at least one tenant

## Setup

```bash
pnpm install        # ensure dependencies
pnpm db:migrate     # verify schema is up to date
```

## Run Isolation Tests (Primary Validation)

```bash
pnpm vitest --run tests/isolation/
```

**Expected outcome**: All tests pass. Two synthetic tenants (created and seeded in `beforeAll`) operate on `promociones`, `leads`, and `tipologías` without any cross-tenant data visibility.

**What the tests verify**:
1. Tenant A queries its own data → gets Tenant A's rows, not Tenant B's
2. Tenant A writes a new lead → Tenant B queries leads → does not see it
3. Concurrent operations from both tenants → row counts match seed expectations per tenant

## Run Unit Tests

```bash
pnpm vitest --run tests/unit/tenant/
```

**Expected outcome**: Unit tests for `PublicContext`, `AuthenticatedContext`, `ApiKeyContext`, and `TenantAwareRepository` pass with coverage ≥ 80%.

## Verify SET LOCAL Enforcement

```bash
# Check for prohibited bare SET (without LOCAL) in the codebase
grep -rn "SET " src/ | grep -v "SET LOCAL" | grep -v "// SET " || echo "OK: No bare SET found"

# Check for raw DB queries outside repositories
grep -rn "db\.\(select\|insert\|update\|delete\|execute\)" src/ | grep -v "repositories/" | grep -v "tenant/" || echo "OK: No raw queries outside allowed paths"
```

## Verify Context Resolution

```bash
pnpm vitest --run tests/isolation/context-resolution.test.ts
```

**Expected outcome**: Tests verify that:
- `domio.com` host → resolves to `PublicContext`
- `panel.domio.com` host with valid session → resolves to `AuthenticatedContext`
- `/api/v1/*` path with valid API key → resolves to `ApiKeyContext`
- Missing/invalid auth → appropriate error (401/500)
