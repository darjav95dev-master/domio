# Quickstart Validation: seo-sitemap-meta

## Prerequisites
- `pnpm dev` running with seed data loaded
- `NEXT_PUBLIC_SITE_URL` set in `.env.local` (e.g., `http://localhost:3000`)
- At least 2 promotions with `status='PUBLISHED'` in the database

## Validation Steps

### 1. Sitemap XML
```bash
curl -s http://localhost:3000/sitemap.xml | head -30
```
**Expected**: Valid XML with `<urlset>`, containing URLs for home, portafolio, published fichas, contacto, sobre. Each `<url>` has `<loc>`, `<lastmod>`, `<changefreq>`.

### 2. Robots.txt
```bash
curl http://localhost:3000/robots.txt
```
**Expected**: Text with `User-agent: *`, `Allow: /`, `Disallow: /panel`, `Disallow: /api`, `Sitemap: .../sitemap.xml`.

### 3. Home metadata
```bash
curl -s http://localhost:3000 | grep -E '(og:title|twitter:card|canonical|application/ld\+json)'
```
**Expected**: OG title, Twitter card, canonical link, Organization JSON-LD.

### 4. Detail page metadata
```bash
curl -s http://localhost:3000/inmuebles/{slug} | grep -E '(og:title|twitter:card|canonical|BreadcrumbList)'
```
**Expected**: OG title (from seo_title or fallback), Twitter card, canonical URL, BreadcrumbList JSON-LD.

### 5. Portafolio metadata
```bash
curl -s http://localhost:3000/portafolio | grep -E '(og:title|twitter:card|canonical)'
```
**Expected**: OG title, Twitter card, canonical URL.

### 6. Lighthouse audit
```bash
npx lighthouse http://localhost:3000 --output=json --output-path=/tmp/lh-home.json
npx lighthouse http://localhost:3000/portafolio --output=json --output-path=/tmp/lh-portafolio.json
```
**Expected**: Performance ≥ 80, Accessibility ≥ 90 in both reports.

### 7. Google Rich Results Test
Validate JSON-LD manually at: https://search.google.com/test/rich-results
- Home: Organization valid
- Detail: BreadcrumbList + RealEstateListing valid

## Unit tests
```bash
pnpm vitest run src/features/seo/ --reporter=dot
```
**Expected**: All tests pass (sitemap URL building, Organization JSON-LD, BreadcrumbList JSON-LD).
