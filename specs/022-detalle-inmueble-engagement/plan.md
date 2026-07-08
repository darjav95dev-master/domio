# Implementation Plan: detalle-inmueble-engagement

**Branch**: `feature/022-detalle-inmueble-engagement` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Componentes de interacción y conversión en la ficha de detalle (F021): formulario de contacto con consentimiento RGPD, botón WhatsApp, botón compartir, e inmuebles relacionados.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Tailwind CSS v4, Zod

**Storage**: PostgreSQL (leads, consent_records, email_queue, contact_config, promociones con PostGIS)

**Testing**: Vitest (unit), Playwright (E2E en F026)

**Target Platform**: Web (Vercel hosting) — SSR

**Performance Goals**: Lighthouse Performance ≥80, Accessibility ≥90

**Constraints**: Consentimiento RGPD obligatorio, emails vía cola (no directo), rate limiting por IP, validación Zod client+server

## Constitution Check

**Scope Rule (§2)**: ✓
- Componentes de engagement → `src/features/engagement/` (feature-specific)
- Formulario → `src/features/engagement/components/ContactForm.tsx`
- WhatsApp, Share → `src/features/engagement/components/`
- Relacionados → `src/features/engagement/components/RelatedProperties.tsx`

**Servicios externos por cola (§11.3)**: ✓
- Emails encolados en email_queue, nunca enviados directamente
- Transacción atómica: lead + consentimiento + emails

**Validación Zod client+server (§4)**: ✓
- Mismo schema en cliente y servidor

**Rate limiting (§1)**: ✓
- Formulario protegido con rate limiting por IP

**Accesibilidad (§6)**: ✓
- WCAG AA, labels asociados, aria-live, focus-visible

## Project Structure

```text
src/
└── features/
    └── engagement/
        ├── components/
        │   ├── ContactForm.tsx
        │   ├── WhatsAppButton.tsx
        │   ├── ShareButton.tsx
        │   └── RelatedProperties.tsx
        ├── server/
        │   ├── create-lead-action.ts
        │   └── get-related-properties.ts
        └── schemas/
            └── contact-form.schema.ts

app/
└── (public)/
    └── inmuebles/
        └── [slug]/
            └── page.tsx (modificado para incluir engagement)
```

## Complexity Tracking

> **No violations detected.**
