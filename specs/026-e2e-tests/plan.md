# Implementation Plan: E2E Tests

**Branch**: `feature/026-e2e-tests` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-e2e-tests/spec.md`

## Summary

Implementar tests end-to-end con Playwright para los 5 recorridos principales de Domio (visitante público, editor de catálogo, agente comercial, consumidor API, administrador) usando Page Object Model. El proyecto ya tiene Playwright configurado (`playwright.config.ts` con `workers: 1`, `fullyParallel: false`, webServer `pnpm dev`) y un smoke test básico. Se construirá una capa de Page Objects sobre `tests/e2e/pages/`, un helper de setup/teardown de base de datos en `tests/e2e/fixtures/`, y 5 archivos de spec (uno por recorrido). Los tests usan los datos del seed script existente (`scripts/seed.ts`) y las credenciales demo (admin@domio.dev, agente1@domio.dev, agente2@domio.dev, operador1@domio.dev — todas con contraseña `Domio2026!`).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: @playwright/test (ya instalado), playwright.config.ts existente

**Storage**: PostgreSQL 16 (Neon) con Drizzle ORM — los tests E2E necesitan BD con datos seed

**Testing**: Playwright (E2E), Vitest (unit/integración — ya existente)

**Target Platform**: Chromium desktop (único project configurado)

**Project Type**: Web application (Next.js 15 App Router)

**Performance Goals**: Suite completa < 5 minutos; recorrido individual < 60 segundos

**Constraints**: `workers: 1`, `fullyParallel: false` (configuración existente); webServer arranca `pnpm dev` automáticamente; no modificar límites operacionales

**Scale/Scope**: 5 suites E2E, ~15-20 Page Objects, 1 fixture helper de BD

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Page Object Model obligatorio (§2) | ✅ PASS | Es el patrón central de esta feature |
| Selectores accesibles: getByRole > getByTestId > getByText (§3) | ✅ PASS | Todos los Page Objects seguirán esta jerarquía |
| Limpiar estado BD antes de cada test (§3) | ✅ PASS | Fixture de reset con TRUNCATE en cascada |
| Playwright para E2E (§3) | ✅ PASS | Ya configurado en playwright.config.ts |
| Script test:e2e en package.json (§3) | ✅ PASS | Ya existe: `playwright test` |
| workers:1, singleFork (§3/§12) | ✅ PASS | Configuración existente respetada |
| Scope Rule (§2) | ✅ PASS | Page Objects en tests/e2e/pages/ (scope de testing) |
| Sin hardcoded secrets (§5) | ✅ PASS | Credenciales demo desde seed, no hardcoded en tests |

## Project Structure

### Documentation (this feature)

```text
specs/026-e2e-tests/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
tests/e2e/
├── smoke.spec.ts                    # Existing — will be absorbed into visitor suite
├── fixtures/
│   ├── db-reset.ts                  # Helper: TRUNCATE + re-seed before each suite
│   └── auth.ts                      # Helper: login actions shared across Page Objects
├── pages/
│   ├── BasePage.ts                  # Abstract base with common navigation/wait helpers
│   ├── HomePage.ts                  # / (public)
│   ├── PortafolioPage.ts            # /portafolio
│   ├── InmuebleDetailPage.ts        # /inmuebles/[slug]
│   ├── ContactoPage.ts              # /contacto
│   ├── LoginPage.ts                 # /panel/login
│   ├── DashboardPage.ts             # /panel
│   ├── CatalogoPage.ts              # /panel/catalogo
│   ├── CatalogoEditPage.ts          # /panel/catalogo/[id]
│   ├── LeadsPage.ts                 # /panel/leads
│   ├── LeadDetailPage.ts            # /panel/leads/[id]
│   ├── EquipoPage.ts                # /panel/equipo
│   ├── ApiKeysPage.ts               # /panel/api-keys
│   ├── ArsopPage.ts                 # /panel/arsop
│   ├── ContenidosContactoPage.ts    # /panel/contenidos/contacto
│   └── SobrePage.ts                 # /sobre
├── visitor.spec.ts                  # Journey 1: Visitante público
├── catalog-editor.spec.ts           # Journey 2: Editor de catálogo
├── sales-agent.spec.ts              # Journey 3: Agente comercial
├── api-consumer.spec.ts             # Journey 4: Consumidor API
└── admin.spec.ts                    # Journey 5: Administrador
```

**Structure Decision**: Tests E2E en `tests/e2e/` siguiendo la estructura existente del proyecto. Page Objects en subdirectorio `pages/` para separación clara entre definiciones de página y specs de recorrido. Fixtures en `fixtures/` para helpers compartidos (reset BD, auth).

## Complexity Tracking

No violations. All constitution gates pass.
