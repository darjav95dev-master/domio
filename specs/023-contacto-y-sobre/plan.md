# Implementation Plan: contacto-y-sobre

**Branch**: `feature/023-contacto-y-sobre` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Páginas `/contacto` y `/sobre` SSR con contenido desde contact_config y content_blocks.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15, Tailwind CSS v4, maplibre-gl
**Storage**: PostgreSQL (contact_config, content_blocks)
**Target Platform**: Web (Vercel) — SSR

## Constitution Check

**Scope Rule (§2)**: ✓
- Componentes de contacto → `src/features/contact/`
- Componentes de sobre → `src/features/about/` (o reutilizar contenidos)

**SSR (§1)**: ✓
- Ambas páginas SSR

## Project Structure

```text
src/features/contact/
├── components/
│   ├── ContactHeader.tsx
│   ├── QuickBand.tsx
│   ├── ContactFormGeneric.tsx
│   └── OfficeMap.tsx
└── server/
    └── get-contact-data.ts

app/(public)/
├── contacto/page.tsx
└── sobre/page.tsx
```

## Complexity Tracking

> **No violations.**
