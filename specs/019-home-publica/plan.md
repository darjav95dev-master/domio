# Implementation Plan: home-publica

**Branch**: `feature/019-home-publica` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Renderizar la home pública SSR con 9 bloques editoriales según design.md §13.1, consumiendo datos de `content_blocks` (F017) y `promociones` (F011). Scroll-reveal, motion, y accesibilidad WCAG AA.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Tailwind CSS v4, @phosphor-icons/react

**Storage**: PostgreSQL (lectura de content_blocks y promociones)

**Testing**: Vitest (unit), Playwright (E2E en F026)

**Target Platform**: Web (Vercel hosting) — SSR/ISR

**Performance Goals**: Lighthouse Performance ≥80, Accessibility ≥90

**Constraints**: SSR obligatorio, sin client-side rendering, prefers-reduced-motion

## Constitution Check

**Scope Rule (§2)**: ✓
- Componentes de home → `src/features/home/` (feature-specific)
- Nav, Footer → reutilizados de `src/shared/components/` (F018)

**SSR obligatorio (§1)**: ✓
- Home renderizada SSR
- Sin renderizado client-side

**Accesibilidad (§6)**: ✓
- WCAG AA, Lighthouse ≥90
- focus-visible, navegación por teclado

**Motion (§6)**: ✓
- prefers-reduced-motion respetado

## Project Structure

```text
src/
└── features/
    └── home/
        ├── components/
        │   ├── Hero.tsx
        │   ├── HowWeWork.tsx
        │   ├── AboutDomio.tsx
        │   ├── FeaturedPortfolio.tsx
        │   ├── Trust.tsx
        │   ├── CTA.tsx
        │   └── FAQ.tsx
        └── hooks/
            └── useScrollReveal.ts

app/
└── (public)/
    └── page.tsx
```

## Complexity Tracking

> **No violations detected.**
