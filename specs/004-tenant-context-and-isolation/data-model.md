# Data Model: Tenant Context and Isolation

> This feature defines no new database tables. It defines the **in-memory context types** and the **abstract repository pattern** that all future domain repositories will extend.

## TenantContext (Abstract Base)

```
TenantContext
├── tenantId: string (UUID)
├── type: 'public' | 'authenticated' | 'apikey'
├── withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>
│   └── Opens db.transaction()
│       └── tx.execute(sql`SET LOCAL app.current_tenant_id = '${this.tenantId}'`)
│       └── [if authenticated] tx.execute(sql`SET LOCAL app.current_user_id = '${this.userId}'`)
│       └── return fn(tx)
└── [abstract] resolveFilters?(): Record<string, unknown>
```

### Required properties
| Field | Type | Description |
|-------|------|-------------|
| `tenantId` | `string` (UUID) | The tenant context for this request |
| `type` | `'public' \| 'authenticated' \| 'apikey'` | Discriminator for context subtype |

### Required method
| Method | Signature | Description |
|--------|-----------|-------------|
| `withTransaction` | `<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>` | Opens transaction, sets LOCAL variables, runs fn |

### Optional method
| Method | Returns | Description |
|--------|---------|-------------|
| `resolveFilters` | `Record<string, unknown>` | Returns WHERE conditions to merge into catalog queries (e.g., `{ status: 'PUBLISHED' }`) |

---

## PublicContext extends TenantContext

```
PublicContext
├── tenantId: from env PUBLIC_TENANT_ID
├── type: 'public'
├── userId: null (no session)
├── role: null
└── resolveFilters(): { status: 'PUBLISHED' }
```

**Resolution**: Middleware detects `host === 'domio.com'` (or `NEXT_PUBLIC_PUBLIC_HOST`), no auth headers present.

**Filters applied**: All catalog-read queries receive `{ status: 'PUBLISHED' }` merged into WHERE clause.

**Validation**: `PUBLIC_TENANT_ID` must be set and valid. If missing, app startup fails.

---

## AuthenticatedContext extends TenantContext

```
AuthenticatedContext
├── tenantId: from Auth.js session JWT
├── type: 'authenticated'
├── userId: from Auth.js session JWT
├── role: 'ADMIN' | 'OPERATOR' | 'AGENT' (from session)
└── resolveFilters(): {} (no mandatory content filter; RLS handles per-row access)
```

**Resolution**: Middleware detects `host === 'panel.domio.com'` (or `NEXT_PUBLIC_AUTH_HOST`), extracts session from Auth.js JWT cookie/token.

**SET LOCAL operations**:
1. `SET LOCAL app.current_tenant_id = '${tenantId}'`
2. `SET LOCAL app.current_user_id = '${userId}'`

**Validation**: Session must be valid (not expired, not tampered). If invalid, middleware returns 401 or redirects to login.

**Scope by role**: The `role` field is available for in-memory authorization checks. RLS policies handle row-level filtering per agent (F002 already defined these).

---

## ApiKeyContext extends TenantContext

```
ApiKeyContext
├── tenantId: from API key lookup
├── type: 'apikey'
├── apiKeyId: UUID of the API key record
├── userId: null
├── role: null
└── resolveFilters(): { kind: 'portfolio', status: 'PUBLISHED' }
```

**Resolution**: Middleware detects path prefix `/api/v1/`, extracts `Authorization: Bearer <key>` header, looks up API key (mock in this feature; real in F016).

**Filters applied**: All catalog-read queries receive `{ kind: 'portfolio', status: 'PUBLISHED' }` merged into WHERE clause — enforced at repository level, not per-endpoint.

**Validation**: API key must be active. If missing/invalid, middleware returns 401. Rate limiting and key hashing are out of scope (F016).

---

## TenantAwareRepository (Abstract Base Class)

```typescript
// Conceptual interface — exact implementation in code
abstract class TenantAwareRepository {
  constructor(protected readonly ctx: TenantContext) {}

  // Primary access point: all DB operations go through this
  protected async withTransaction<T>(
    fn: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    return this.ctx.withTransaction(fn);
  }

  // Optional helper: merge context filters into query conditions
  protected applyContextFilters<T extends Record<string, unknown>>(
    base: T
  ): T {
    const filters = this.ctx.resolveFilters?.() ?? {};
    return { ...base, ...filters };
  }
}
```

**Contract**: Every domain repository in the project MUST extend `TenantAwareRepository`. The `withTransaction` method is the ONLY way to execute database operations. Direct `db.select()`, `db.insert()`, etc. outside a `withTransaction` callback is a CI violation.

**Relationship to existing schema**: F002 created tables with `tenant_id` columns, RLS policies, and composite indices. This feature's `TenantAwareRepository` sets the session variables (`app.current_tenant_id`, `app.current_user_id`) that those RLS policies read. The two features work together: F002 defines the policies; F004 sets the variables.
