# Tasks: Visual System Implementation

**Feature**: F003 | **Branch**: feature/003-visual-system-implementation

## Phase 1: Tokens + Fuentes
- [ ] T001 Definir CSS custom properties en `app/globals.css` :root con paleta completa design.md §2 (ink, parchment, slate, terracota, status, shadows, focus)
- [ ] T002 Definir tokens semánticos CSS (bg, fg, border, accent) en `app/globals.css`
- [ ] T003 Mapear tokens a `@theme inline` de Tailwind v4
- [ ] T004 Cargar fuentes: Fraunces (opsz axis), Inter, Geist Mono via next/font/google en `app/layout.tsx`
- [ ] T005 Verificar `colorScheme: 'light'` en `<html>`, sin @media prefers-color-scheme: dark

## Phase 2: Primitives (tests primero)
- [ ] T006 [P] Test de Button: renderiza 4 variantes, focus-visible ring, disabled state
- [ ] T007 [P] Test de Input: label asociado, error state con aria-describedby, focus ring
- [ ] T008 [P] Test de Skeleton: role="status", aria-hidden, shimmer class, reduced-motion
- [ ] T009 [P] Test de Toast: role="alert", aria-live="polite", 4 variantes
- [ ] T010 [P] Test de MediaImage: alt obligatorio, fallback gradient on error

## Phase 3: Implementación de primitives
- [ ] T011 `src/shared/components/button.tsx`: 4 variants (primary/secondary/ghost/link), motion, focus-visible per §7.1
- [ ] T012 `src/shared/components/input.tsx`: FormField con label, focus/error/disabled, help text, aria-describedby per §7.2
- [ ] T013 `src/shared/components/skeleton.tsx`: shimmer gradient, reduced-motion, role status per §17
- [ ] T014 `src/shared/components/toast.tsx`: role alert, aria-live, 4 variantes (success/error/warning/info)
- [ ] T015 `src/shared/components/media-image.tsx`: next/image wrapper, alt obligatorio, fallback gradient per §15

## Phase 4: Iconos + Barrel
- [ ] T016 Instalar `@phosphor-icons/react`
- [ ] T017 Crear `src/shared/components/index.ts` barrel export
- [ ] T018 [P] Verificar `pnpm typecheck`, `pnpm lint`, `pnpm test:run` pasan
- [ ] T019 [P] Verificar `pnpm build` exitoso con fuentes y tokens cargados
