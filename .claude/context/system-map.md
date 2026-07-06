# System Map — bookrack-sandbox
> Last updated: 2026-06-30 | git: a6cb388

## STACK
Next.js 16 | React 19 | TypeScript strict | Tailwind CSS v4 | Drizzle ORM | Postgres | Vitest | Testing Library | Playwright

## ARCHITECTURE
PUBLIC (SSR): `app/` routes (catalog, books, auth)
AUTH: `middleware.ts` — tenant context via hostname
PRIVATE (CSR): N/A — all Server Components by default
DB: Drizzle ORM with pg Pool, RLS per tenant, migrations in `src/infrastructure/db/migrations/`

## FILE INDEX
`src/shared/components/Skeleton.tsx` → Loading placeholder (Server, role=status, animate-pulse)
`src/shared/components/Badge.tsx` → Compact label (Server, variant=default|genre)
`src/shared/components/BookCard.tsx` → Book display card (Server, composes BookCover+Badge)
`src/shared/components/FilterBar.tsx` → Accessible filter controls (Client, 3 selects in form GET)
`src/shared/components/BookCover.tsx` → Inline SVG cover (Server, from feature 006)
`src/infrastructure/db/` → Drizzle schema, migrations, seed
`src/infrastructure/tenant/` → Tenant context middleware and context
`src/features/catalog/` → Catalog service and repositories

## ACTIVE FEATURES
008 · shared-ui-components: ✅ done — implement complete, branch ready for merge
007 · seed-demo-library: ✅ merged to main
006 · cover-generator: ✅ merged to main

## KNOWN BUGS / DECISIONS
- `db.test.ts` expected error message mismatch: pre-existing, not related to feature 008
- Coverage global threshold fails because only `src/shared/components/` scope tested; other `src/` files have 0%

## PENDING
- Merge feature/008-shared-ui-components to main (human decision)
- Feature 009 (book-detail-page) is next on roadmap
