# Implementation Plan: detalle-inmueble-core

**Branch**: `feature/021-detalle-inmueble-core` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Ficha pública SSR/ISR en `/inmuebles/[slug]` con detail hero, infobar 4-col, renderizado de bloques editoriales, tabla de tipologías, mapa con maplibre-gl respetando map_privacy_mode, y SEO meta + datos estructurados RealEstateListing. Consume datos de promociones con PublicContext (garantiza status='PUBLISHED').

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Tailwind CSS v4, Zod, maplibre-gl

**Storage**: PostgreSQL (lectura de promociones, tipologías, unidades, bloques editoriales, media_assets con PublicContext)

**Testing**: Vitest (unit), Playwright (E2E en F026)

**Target Platform**: Web (Vercel hosting) — SSR/ISR

**Performance Goals**: Lighthouse Performance ≥80, Accessibility ≥90

**Constraints**: SSR/ISR obligatorio, map_privacy_mode respeta coordenadas, slug persistente, bloques condicionales por kind

## Constitution Check

**Scope Rule (§2)**: ✓
- Componentes de detalle → `src/features/detail/` (feature-specific)
- Nav, Footer → reutilizados de `src/shared/components/` (F018)
- MediaImage → reutilizado de `src/shared/components/` (F003/F013)

**SSR obligatorio (§1)**: ✓
- Ficha renderizada SSR con revalidación ISR
- Mapa es Client Component (necesita interactividad)

**Modo de privacidad (§7.3)**: ✓
- Si map_privacy_mode='AREA', coordenadas exactas NUNCA aparecen en HTML, JSON embebido ni schema.org
- Solo location_approx se expone

**Accesibilidad (§6)**: ✓
- WCAG AA, Lighthouse ≥90
- aria-labels, alt_text obligatorio, focus-visible

**Suelo de calidad visual (§6)**: ✓
- Toda imagen con fallback robusto (nunca caja negra)
- Página compuesta con contenido real (no placeholders vacíos)

## Project Structure

```text
src/
└── features/
    └── detail/
        ├── components/
        │   ├── DetailHero.tsx
        │   ├── InfoBar.tsx
        │   ├── EditorialBlocks.tsx
        │   ├── BlockDescripcion.tsx
        │   ├── BlockCalidades.tsx
        │   ├── BlockZonasComunes.tsx
        │   ├── BlockUbicacion.tsx
        │   ├── BlockPlazos.tsx
        │   ├── TypologyTable.tsx
        │   ├── MapPromocion.tsx
        │   └── SeoStructuredData.tsx
        └── server/
            └── get-detail-data.ts

app/
└── (public)/
    └── inmuebles/
        └── [slug]/
            └── page.tsx
```

## Complexity Tracking

> **No violations detected.**
