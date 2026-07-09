# Research: seo-sitemap-meta

## R1: Next.js Metadata API for sitemap and robots

**Decision**: Use `app/sitemap.ts` exporting `MetadataRoute.Sitemap` and `app/robots.ts` exporting `MetadataRoute.Robots`.

**Rationale**: Next.js 15 App Router provides native support for sitemap.xml and robots.txt generation via the Metadata API. These files are generated server-side on each request (or cached per revalidation strategy). No external dependencies needed.

**Alternatives considered**:
- `next-sitemap` package: adds dependency, less control over dynamic content, requires post-build step
- Static sitemap.xml: doesn't reflect DB changes, requires manual regeneration

**References**: Next.js docs on [sitemap.xml](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) and [robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)

## R2: Tenant config JSONB for Organization data

**Decision**: Read Organization data (logo, phone, email, address) from `tenants.config` JSONB field.

**Rationale**: The tenant schema already has a `config` JSONB column designed for extensible metadata. Adding dedicated columns would require a migration and break the existing pattern. The seed data (F009) populates this config.

**Alternatives considered**:
- Dedicated columns on `tenants`: requires migration, changes existing schema
- Separate `tenant_settings` table: over-engineering for MVP

## R3: Canonical URL from environment variable

**Decision**: Centralize site URL in `src/shared/utils/seo/site-url.ts` reading `NEXT_PUBLIC_SITE_URL` with fallback to `http://localhost:3000`.

**Rationale**: Canonical URLs must be absolute. Using an env var allows different URLs per environment (preview, staging, production). The current codebase has the canonical URL hardcoded as `https://domio.com` in the detail page — this must be fixed.

**Alternatives considered**:
- Hardcoded domain: fragile, breaks in preview environments
- Reading from request headers: unreliable behind proxies/CDN

## R4: OG image strategy

**Decision**: For detail pages with cover image → use R2 URL of cover asset. For pages without cover or static pages → use default OG image URL from tenant config.

**Rationale**: OG images must be publicly accessible absolute URLs. R2 provides public URLs for assets. The cover image is already associated with promotions via `media_assets.is_cover`.

**Alternatives considered**:
- Dynamic OG generation with `next/og`: adds complexity, not needed for MVP
- Static OG image for all pages: poor social sharing experience

## R5: BreadcrumbList JSON-LD structure

**Decision**: 3-level breadcrumb: Home → Portafolio → Promotion name. Injected as `<script type="application/ld+json">` in the detail page.

**Rationale**: Reflects the actual navigation hierarchy. Google recommends BreadcrumbList for sites with hierarchical structure. The existing `RealEstateListing` JSON-LD in F021 is not modified.

**Alternatives considered**:
- Deeper breadcrumbs (by property type): unnecessary for MVP
- No breadcrumbs: missed SEO opportunity

## R6: Lighthouse thresholds

**Decision**: Performance ≥ 80 and Accessibility ≥ 90 as hard gates per constitution §6 and §8.

**Rationale**: Constitutional requirements. Any deviations found during this feature must be fixed within the feature, not deferred.

**Approach**: Run Lighthouse via CLI on home, portafolio, and 3+ detail pages. Fix issues found (image optimization, missing alt text, contrast ratios, etc.).
