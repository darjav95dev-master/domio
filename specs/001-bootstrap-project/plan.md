# Implementation Plan: Bootstrap del proyecto

**Branch**: `feature/001-bootstrap-project` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-bootstrap-project/spec.md`

## Summary

Scaffold completo del proyecto Domio con Next.js 15 (App Router, TypeScript strict), tooling de calidad (ESLint con sonarjs/jsx-a11y, Prettier, Husky, Vitest, Playwright), estructura de carpetas según architecture.md §5, scripts npm obligatorios, y configuración de variables de entorno documentada. Esta feature no tiene lógica de dominio — es puramente infraestructural y fundacional para las 26 features restantes del roadmap.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15, React 19, Tailwind CSS v4, Vitest, Playwright, ESLint (sonarjs + jsx-a11y), Prettier, Husky

**Storage**: N/A (sin base de datos en esta feature)

**Testing**: Vitest (unit/isolation) + Playwright (e2e)

**Target Platform**: Web (server + client), Node.js ≥ 20

**Project Type**: Web application (Next.js App Router) — single project, no monorepo

**Performance Goals**: Build < 60s en local, dev server arranca < 10s

**Constraints**: Vitest `singleFork: true`, Playwright `workers: 1` (límites operacionales del host — constitution §12)

**Scale/Scope**: 1 proyecto, ~15 archivos de configuración, estructura de ~20 directorios vacíos, 0 componentes de dominio

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| §1 Stack (Next.js + TS strict + pnpm) | ✅ PASS | Scaffold con `create-next-app`, pnpm como packageManager, tsconfig strict: true |
| §2 Scope Rule (shared/ vs features/) | ✅ PASS | Estructura de carpetas creada según architecture.md §5 |
| §3 TDD (test primero) | ✅ PASS | Smoke test de arranque antes de cualquier implementación; tests de configuración validan tooling |
| §4 Linting (ESLint + sonarjs) | ✅ PASS | ESLint configurado con plugins sonarjs y jsx-a11y; cognitive-complexity ≤ 15 |
| §5 Secrets (.env.example/.gitignore) | ✅ PASS | `.env.example` commitado sin valores, `.env.local` en `.gitignore` |
| §8 Commits convencionales | ✅ PASS | Husky pre-commit hook fuerza lint + typecheck |
| §9 Git hooks (Husky) | ✅ PASS | pre-commit (lint + typecheck), pre-push (test:run + build) |
| §12 Límites operacionales | ✅ PASS | Vitest `singleFork: true`, Playwright `workers: 1` |

**Gate result**: ✅ ALL PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-bootstrap-project/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

Note: `data-model.md` and `contracts/` are not applicable — this feature has no domain entities or external interfaces.

### Source Code (repository root)

```text
app/
├── (public)/
│   └── page.tsx              # Landing page placeholder
├── (auth)/
│   └── layout.tsx            # Auth layout placeholder
├── api/
│   └── health/
│       └── route.ts           # GET /api/health → { status: "ok" }
├── layout.tsx                 # Root layout (metadata, font loading)
├── globals.css                # Tailwind v4 entry
└── page.tsx                   # Root page (default Next.js welcome)

src/
├── shared/
│   ├── types/                 # Shared TypeScript types
│   ├── utils/                 # Shared utilities
│   ├── constants/             # Centralized constants
│   ├── components/            # Shared UI primitives (future)
│   ├── hooks/                 # Shared hooks (future)
│   └── strategies/            # Strategy pattern implementations (future)
├── features/                  # Feature-specific code (empty initially)
├── context/                   # Global state (future)
└── infrastructure/            # External services (future)

tests/
├── unit/
│   └── smoke.test.ts          # "app exists" smoke test
├── isolation/                 # Isolation tests (future)
├── contract/                  # Contract tests (future)
└── e2e/
    └── smoke.spec.ts          # "homepage loads" Playwright test

Config files (root):
├── next.config.ts             # Next.js 15 config
├── tsconfig.json              # TypeScript strict, exclude tests/
├── eslint.config.mjs          # ESLint flat config (sonarjs + jsx-a11y)
├── .prettierrc                # Prettier config
├── vitest.config.ts           # Vitest config (singleFork, coverage thresholds)
├── playwright.config.ts       # Playwright config (workers: 1)
├── postcss.config.mjs         # PostCSS (Tailwind v4)
├── tailwind.config.ts         # Tailwind v4 config
├── .env.example               # 10 documented env vars (no real values)
├── .gitignore                 # node_modules, .next, .env.local, coverage/
├── package.json               # pnpm, scripts, dependencies
├── .husky/
│   ├── pre-commit             # pnpm lint && pnpm typecheck
│   └── pre-push               # pnpm test:run && pnpm build
└── README.md                  # Install & scripts quick-reference
```

**Structure Decision**: Single Next.js App Router project (Option 1 from template, adapted). No monorepo. The `app/` directory contains Next.js routing groups; `src/` contains business logic organized by Scope Rule; `tests/` mirrors the test pyramid (unit → isolation → contract → e2e). This matches architecture.md §5 exactly.

## Complexity Tracking

No violations. All constitution principles are satisfied by design.
