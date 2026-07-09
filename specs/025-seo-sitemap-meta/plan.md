# Implementation Plan: seo-sitemap-meta

**Branch**: `feature/025-seo-sitemap-meta` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

## Summary

Configuración SEO completa para superficies públicas: sitemap XML dinámico (`app/sitemap.ts`), robots.txt refinado (`app/robots.ts`), Metadata API con Open Graph y Twitter Cards en todas las páginas públicas, canonical URLs dinámicas desde `NEXT_PUBLIC_SITE_URL`, datos estructurados JSON-LD (`Organization` en home, `BreadcrumbList` en fichas), y verificación de umbrales Lighthouse (Performance ≥ 80, Accessibility ≥ 90).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 Metadata API (`app/sitemap.ts`, `app/robots.ts`, `generateMetadata`)

**Storage**: PostgreSQL (promociones con `seo_title`, `seo_description`, `updated_at`; tenants con `name`, `config` JSONB)

**Testing**: Vitest (unit para funciones puras: fallback SEO, structured data, sitemap URL building)

**Target Platform**: Web (Vercel hosting) — SSR/ISR pages

**Performance Goals**: Lighthouse Performance ≥ 80, Accessibility ≥ 90

**Constraints**: PublicContext para consultas de catálogo (SET LOCAL en transacción), canonical URLs desde env var, fallback determinista para metadata, JSON-LD inyectado en `<head>`, sin coordenadas exactas si map_privacy_mode='AREA'

## Constitution Check

**Scope Rule (§2)**: ✓
- Sitemap/robots → `app/sitemap.ts`, `app/robots.ts` (Next.js convention)
- Utilidades SEO puras → `src/shared/utils/seo/` (usadas por múltiples features)
- generateMetadata → en cada `page.tsx` público
- JSON-LD structured data → `src/features/seo/` (feature-specific)

**Repository Pattern (§2.3)**: ✓
- Sitemap consulta catálogo vía repositorio context-aware con PublicContext
- No queries directas fuera de repositorios

**SET LOCAL (§2.2)**: ✓
- Toda consulta al catálogo en sitemap se ejecuta en transacción con SET LOCAL

**Constantes centralizadas (§2)**: ✓
- SITE_URL desde `NEXT_PUBLIC_SITE_URL` env var, centralizada en utilidad compartida
- Frecuencias de sitemap como constantes

**TDD (§3)**: ✓
- Tests unitarios para funciones puras (fallback SEO, structured data builders)
- Tests de integración para sitemap y robots (validación de output)

**Sin renderizado client-side en públicas (§1)**: ✓
- Todo SEO es server-side (Metadata API de Next.js)

## Project Structure

```text
app/
├── sitemap.ts                    ← NUEVO: sitemap XML dinámico
├── robots.ts                     ← MODIFICAR: refinar con Sitemap directive
├── (public)/
│   ├── page.tsx                  ← MODIFICAR: añadir generateMetadata + Organization JSON-LD
│   ├── portafolio/
│   │   └── page.tsx              ← MODIFICAR: enriquecer metadata con OG/Twitter
│   ├── inmuebles/
│   │   └── [slug]/
│   │       └── page.tsx          ← MODIFICAR: canonical dinámico + BreadcrumbList JSON-LD
│   ├── contacto/
│   │   └── page.tsx              ← MODIFICAR: enriquecer metadata con OG/Twitter
│   └── sobre/
│       └── page.tsx              ← MODIFICAR: enriquecer metadata con OG/Twitter

src/
├── shared/
│   └── utils/
│       └── seo/
│           ├── site-url.ts       ← NUEVO: helper para NEXT_PUBLIC_SITE_URL
│           ├── default-og-image.ts ← NUEVO: URL de imagen OG por defecto
│           └── constants.ts      ← NUEVO: frecuencias sitemap, defaults
├── features/
│   └── seo/
│       ├── server/
│       │   ├── sitemap-urls.ts   ← NUEVO: genera lista de URLs para sitemap
│       │   ├── organization-json-ld.ts ← NUEVO: builder Organization JSON-LD
│       │   └── breadcrumb-json-ld.ts   ← NUEVO: builder BreadcrumbList JSON-LD
│       └── server/
│           ├── sitemap-urls.spec.ts
│           ├── organization-json-ld.spec.ts
│           └── breadcrumb-json-ld.spec.ts

.env.example                      ← MODIFICAR: añadir NEXT_PUBLIC_SITE_URL
```

## Research & Decisions

### Decision 1: Sitemap generation approach
**Decision**: Usar Next.js Metadata API (`app/sitemap.ts` que exporta `MetadataRoute.Sitemap`).
**Rationale**: Es el patrón nativo de Next.js 15, genera XML válido automáticamente, soporta `lastmod` y `changeFrequency`. No requiere dependencias externas.
**Alternatives considered**: `next-sitemap` package (añade dependencia, menos control), sitemap estático (no refleja cambios en BD).

### Decision 2: Tenant logo and contact info
**Decision**: Extraer del campo `config` JSONB del tenant (ya existe en schema). El seed data (F009) debe poblar `config` con `{ logo: string, phone: string, email: string, address: string }`.
**Rationale**: No requiere migración de schema. El JSONB `config` ya está diseñado para metadata extensible del tenant.
**Alternatives considered**: Añadir columnas dedicadas a `tenants` (requeriría migración, rompe el patrón de config JSONB).

### Decision 3: Canonical URL strategy
**Decision**: Centralizar en `src/shared/utils/seo/site-url.ts` que lee `NEXT_PUBLIC_SITE_URL`. Todas las páginas usan este helper para construir canonical URLs absolutas.
**Rationale**: Evita hardcoding de dominios. Permite diferentes URLs por entorno (preview, staging, producción).
**Alternatives considered**: Hardcoded `https://domio.com` (frágil, no funciona en preview environments).

### Decision 4: OG image strategy
**Decision**: Para fichas con portada → URL firmada de R2 de la imagen de portada. Para páginas sin portada o estáticas → imagen OG por defecto del tenant (almacenada en R2, URL configurable).
**Rationale**: Las imágenes OG deben ser URLs absolutas accesibles públicamente. R2 signed URLs con TTL largo o URLs públicas de R2 cumplen este requisito.
**Alternatives considered**: Generar OG images dinámicamente con `next/og` (añade complejidad, no es necesario para MVP).

### Decision 5: BreadcrumbList structure
**Decision**: 3 niveles: Home (`/`) → Portafolio (`/portafolio`) → Nombre de la promoción. JSON-LD con `@type: BreadcrumbList` y `itemListElement` array.
**Rationale**: Refleja la jerarquía de navegación real del sitio. Google recomienda breadcrumbs para sitios con estructura jerárquica.
**Alternatives considered**: Breadcrumbs más profundos (ej: por tipo de inmueble) — innecesarios para MVP.

## Data Model

No new database tables or columns. This feature reads existing data:
- `promociones`: `seo_title`, `seo_description`, `updated_at`, `status`, `slug`, `nombre`, `tipo`, `operacion`, `municipio`, `n_dormitorios`, `kind`
- `tenants`: `name`, `config` (JSONB with logo, phone, email, address)
- `media_assets`: `r2_key`, `is_cover`, `alt_text` (for OG images)
- `contact_config`: phone, email, address (for Organization JSON-LD)

## Contracts

### Sitemap XML contract
- GET `/sitemap.xml` → 200, Content-Type `application/xml`
- Valid sitemap.org schema
- URLs: home, portafolio, fichas PUBLISHED, contacto, sobre
- Each URL has `loc`, `lastmod`, `changefreq`

### robots.txt contract
- GET `/robots.txt` → 200, Content-Type `text/plain`
- `User-agent: *`, `Allow: /`, `Disallow: /panel`, `Disallow: /api`
- `Sitemap: {NEXT_PUBLIC_SITE_URL}/sitemap.xml`

### Metadata contract (per page)
- Every public page: `title`, `description`, `alternates.canonical`, `openGraph`, `twitter`
- Detail pages: additionally `BreadcrumbList` JSON-LD
- Home: additionally `Organization` JSON-LD

## Quickstart Validation

1. **Sitemap**: `curl http://localhost:3000/sitemap.xml` → XML válido con URLs
2. **Robots**: `curl http://localhost:3000/robots.txt` → texto con Sitemap directive
3. **Home metadata**: Ver HTML de `/` → `<meta property="og:title">`, `<meta name="twitter:card">`, `<link rel="canonical">`, JSON-LD Organization
4. **Detail metadata**: Ver HTML de `/inmuebles/{slug}` → canonical dinámico, BreadcrumbList JSON-LD, OG image de portada
5. **Lighthouse**: `npx lighthouse http://localhost:3000 --output json` → Performance ≥ 80, Accessibility ≥ 90
6. **Rich Results Test**: Validar JSON-LD en https://search.google.com/test/rich-results
