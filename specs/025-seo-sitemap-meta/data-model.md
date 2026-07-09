# Data Model: seo-sitemap-meta

## Summary

No new database tables or columns. This feature reads existing data to generate SEO artifacts.

## Entities Read

### promociones (existing)
Fields used:
- `slug` — URL path segment for detail pages
- `status` — filter: only `PUBLISHED` included in sitemap
- `seo_title` — optional override for `<title>` and OG title
- `seo_description` — optional override for meta description and OG description
- `updated_at` — used for `lastmod` in sitemap
- `nombre` — used in fallback metadata and BreadcrumbList
- `tipo` — used in fallback metadata
- `operacion` — used in fallback metadata
- `municipio` — used in fallback metadata
- `n_dormitorios` — used in fallback metadata
- `kind` — both `portfolio` and `external` are public-facing

### tenants (existing)
Fields used:
- `name` — Organization name in JSON-LD
- `config` (JSONB) — contains `{ logo, phone, email, address }` for Organization JSON-LD and default OG image

### media_assets (existing)
Fields used:
- `r2_key` — for constructing OG image URL from cover asset
- `is_cover` — identifies the cover image for OG
- `alt_text` — used in OG image alt

### contact_config (existing)
Fields used:
- `phone` — Organization contactPoint
- `email` — Organization contactPoint
- `address` — Organization address

## Data Flow

```
Sitemap generation:
  PublicContext → PromocionRepository.findPublished() → URL entries with lastmod

Metadata generation (per page):
  generateMetadata() → reads promotion/tenant data → returns Metadata object

JSON-LD generation:
  Organization: reads tenant config + contact_config → JSON-LD script
  BreadcrumbList: reads promotion nombre + slug → JSON-LD script
  RealEstateListing: existing (F021), not modified
```

## Validation Rules

- Sitemap: only `status='PUBLISHED'` promotions included
- Canonical URLs: must be absolute, using `NEXT_PUBLIC_SITE_URL`
- OG images: must be absolute URLs (R2 signed or public)
- JSON-LD: must validate against schema.org definitions
- Fallback metadata: deterministic pattern when seo_title/seo_description are null
