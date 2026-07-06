# Feature Specification: Visual System Implementation

**Feature Branch**: `feature/003-visual-system-implementation`
**Created**: 2026-07-06
**Input**: Materializar design.md en código: tokens CSS, fuentes, primitives (Button, Input, Skeleton, Toast, MediaImage), iconos Phosphor.

## User Stories

### US1 — Tokens visuales disponibles (P1)
Desarrollador usa `var(--color-bg-canvas)` en CSS y obtiene `#FBF8F3`. Tailwind intellisense reconoce `bg-bg-canvas`.

**Test**: Inspeccionar `:root` en devtools → todas las custom properties definidas.

### US2 — Fuentes cargadas correctamente (P1)
Fraunces (display + italic), Inter (body), Geist Mono (metadata) se cargan sin layout shift.

**Test**: Lighthouse audit → sin warning de font-display. Texto renderiza en Fraunces.

### US3 — Primitives reutilizables (P1)
Button con 4 variantes, Input con estados, Skeleton, Toast, MediaImage funcionan.

**Test**: Renderizar cada componente con sus variantes y estados → comportamiento correcto.

### US4 — Iconos Phosphor integrados (P2)
Iconos 20×20 nav, 16×16 inline, 12×12 meta; aria-hidden/aria-label correcto.

## Requirements (10 FRs)
- FR-001: CSS custom properties en :root con TODOS los tokens de design.md §2
- FR-002: @theme inline de Tailwind v4 mapeando tokens
- FR-003: next/font/google con Fraunces (opsz axis), Inter, Geist Mono
- FR-004: Componente Button con 4 variantes, motion, focus-visible
- FR-005: Componente Input/FormField con label, estados, aria-describedby
- FR-006: Componente Skeleton con shimmer, reduced-motion, role status
- FR-007: Componente Toast con role alert, aria-live, 4 variantes
- FR-008: Componente MediaImage con fallback gradient, alt obligatorio
- FR-009: @phosphor-icons/react instalado, tamaños canónicos
- FR-010: Sin dark mode — colorScheme: 'light' en layout

## Success Criteria
- SC-001: DevTools muestra todas las custom properties en :root
- SC-002: Lighthouse accesibilidad ≥ 95
- SC-003: Todos los primitives renderizan sin errores
- SC-004: pnpm build exitoso con fuentes cargadas correctamente
