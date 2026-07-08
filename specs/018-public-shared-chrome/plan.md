# Implementation Plan: public-shared-chrome

**Branch**: `feature/018-public-shared-chrome` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

Construir el layout compartido de la superficie pública (`app/(public)/`) con tres elementos estructurales: Nav fijo con transición over-hero/glass, Footer slate de 4 columnas, y skip-to-content accesible. Todo SSR, sin lógica de negocio ni contexto de tenant.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Tailwind CSS v4, @phosphor-icons/react

**Storage**: N/A (no persistencia en esta feature)

**Testing**: Vitest (unit), Playwright (E2E en F026)

**Target Platform**: Web (Vercel hosting) — SSR en superficies públicas

**Project Type**: Web application (SaaS multi-tenant inmobiliario)

**Performance Goals**: Transiciones del Nav <100ms, Lighthouse Accessibility ≥90

**Constraints**: Sin dark mode, sin lógica de negocio en el layout, Scope Rule (shared/components)

**Scale/Scope**: 3 componentes compartidos (Nav, Footer, SkipToContent) + 1 layout

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Scope Rule (§2)**: ✓
- Nav, Footer, SkipToContent → `src/shared/components/` (usados por toda la superficie pública)
- PublicLayout → `app/(public)/layout.tsx` (orquestación)

**Accesibilidad (§6)**: ✓
- WCAG AA es piso, no techo
- Skip-to-content funcional
- focus-visible ring 2px terracota + offset 3px
- Navegación por teclado completa
- Lighthouse Accessibility ≥90

**No dark mode (§12.4)**: ✓
- `<html style={{ colorScheme: 'light' }}>` ya está en root layout
- No se sobreescribe

**SSR obligatorio (§1)**: ✓
- Sin renderizado client-side del marco
- Nav usa `useEffect` solo para detección de scroll (progresivo)

**Iconos (§14)**: ✓
- `@phosphor-icons/react` (instalado en F003)
- Hamburger Icon 20×20 con `aria-label`
- Iconos decorativos con `aria-hidden="true"`

## Project Structure

### Documentation (this feature)

```text
specs/018-public-shared-chrome/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A — no data model)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A — no contracts)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
└── shared/
    └── components/
        ├── Nav.tsx
        ├── Footer.tsx
        └── SkipToContent.tsx

app/
└── (public)/
    └── layout.tsx
```

**Structure Decision**: Componentes compartidos en `src/shared/components/` (Scope Rule). Layout en `app/(public)/layout.tsx`. No hay lógica de negocio ni repositorios.

## Complexity Tracking

> **No violations detected.** All constitution gates pass without justification needed.
