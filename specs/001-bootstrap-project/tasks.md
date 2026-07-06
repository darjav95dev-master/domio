# Tasks: Bootstrap del proyecto

**Feature**: F001 · bootstrap-project
**Branch**: feature/001-bootstrap-project
**Input**: Design documents from `specs/001-bootstrap-project/`

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

## Phase 1: Setup (project initialization)

**Goal**: Scaffold Next.js 15 con TypeScript strict y Tailwind v4. Sin esto, nada más puede ejecutarse.

**Independent Test**: `pnpm dev` arranca en localhost:3000.

- [ ] T001 Scaffold Next.js 15 con `create-next-app`: App Router, TypeScript strict, Tailwind CSS, pnpm, `src/` directory — flags: `--typescript --tailwind --eslint --app --src-dir --use-pnpm` en raíz del repo
- [ ] T002 Configurar `package.json` con `"packageManager": "pnpm@9.x"`, `"engines": { "node": ">=20" }`, e instalar dependencias base con `pnpm install`
- [ ] T003 Crear `tsconfig.json` con `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exclude": ["tests/", "node_modules/", ".next/"]`, `"paths": { "@/*": ["./src/*"] }`

---

## Phase 2: Foundational (config files — bloquea todos los user stories)

**Goal**: Configurar todas las herramientas de calidad y testing. Sin estas configuraciones, ninguna verificación posterior funciona.

**Independent Test**: `pnpm lint` y `pnpm typecheck` ejecutan sin errores (aunque aún no haya código de dominio).

- [ ] T004 [P] Crear `eslint.config.mjs` (flat config) con plugins: `@typescript-eslint`, `sonarjs` (cognitive-complexity ≤ 15, no-duplicate-string threshold 3, no-identical-functions), `jsx-a11y` — extender `next/core-web-vitals` y `next/typescript`
- [ ] T005 [P] Crear `.prettierrc` con `semi: true`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2` y `.prettierignore` excluyendo `node_modules/`, `.next/`, `dist/`, `coverage/`
- [ ] T006 [P] Crear `vitest.config.ts` con `pool: 'forks'`, `singleFork: true`, `fileParallelism: false`, `include: ['tests/**/*.test.ts']`, coverage thresholds 80% (statements, branches, functions, lines), path alias `@/` → `src/`
- [ ] T007 [P] Crear `playwright.config.ts` con `workers: 1`, `fullyParallel: false`, `testDir: './tests/e2e'`, `webServer.command: 'pnpm dev'`, `webServer.port: 3000`
- [ ] T008 [P] Crear `postcss.config.mjs` y `tailwind.config.ts` compatibles con Tailwind v4 (`@theme inline` con CSS variables de diseño para futuro F003)
- [ ] T009 [P] Crear `next.config.ts` con config base: `reactStrictMode: true`, `output: 'standalone'`, y soporte para `images.remotePatterns` vacío (se poblará en features futuras)
- [ ] T010 Agregar scripts a `package.json`: `"typecheck": "tsc --noEmit"`, `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"`, `"test:e2e": "playwright test"`, `"test:contract": "echo 'contract tests — reserved'"`, `"quality": "pnpm lint && pnpm typecheck && pnpm test:run"`, `"verify": "pnpm quality && pnpm test:contract && pnpm test:e2e && pnpm build"`

---

## Phase 3: User Story 1+5 — Scaffold arrancable + estructura de carpetas (P1)

**Goal**: La app arranca sin errores y la estructura de carpetas coincide con architecture.md §5.

**Independent Test**: `pnpm dev` → localhost:3000 muestra página funcional. `ls app/` y `ls src/` coinciden con el plan.

### Tests for US1+US5

- [ ] T011 [P] [US1] Escribir smoke test en `tests/unit/smoke.test.ts` que verifica que `pnpm dev` arranca (import dinámico de Next.js, testea que el proceso no crashea)
- [ ] T012 [P] [US1] Escribir smoke test E2E en `tests/e2e/smoke.spec.ts` que abre localhost:3000 y verifica título de página y status 200

### Implementation for US1+US5

- [ ] T013 [US1] Crear estructura de carpetas según architecture.md §5: `app/(public)/`, `app/(auth)/`, `app/api/health/`, `src/shared/{types,utils,constants,components,hooks,strategies}/`, `src/features/`, `src/context/`, `src/infrastructure/`, `tests/{unit,isolation,contract,e2e}/` — cada directorio con `.gitkeep` para trackear en git
- [ ] T014 [US1] Crear `app/layout.tsx` con metadata base (title: "Domio", description), `<html lang="es">` con `colorScheme: 'light'`, y `globals.css` import
- [ ] T015 [US1] Crear `app/(public)/page.tsx` con página landing placeholder (componente simple con `<main>` y texto "Domio — Próximamente")
- [ ] T016 [US1] Crear `app/(auth)/layout.tsx` con layout auth placeholder
- [ ] T017 [US1] Crear `app/api/health/route.ts` con endpoint GET que devuelve `Response.json({ status: "ok" })` y status 200

---

## Phase 4: User Story 2 — Verificación de calidad automatizada (P1)

**Goal**: `pnpm quality` ejecuta lint + typecheck + test:run en un solo paso y devuelve código 0.

**Independent Test**: `pnpm quality` termina con exit code 0 cuando no hay errores.

### Tests for US2

- [ ] T018 [P] [US2] Test de configuración de ESLint en `tests/unit/eslint-config.test.ts`: verifica que el flat config carga correctamente, que las reglas sonarjs están activas (cognitive-complexity, no-duplicate-string), y que jsx-a11y está habilitado

### Implementation for US2

- [ ] T019 [US2] Verificar que `pnpm lint` funciona con la config actual (corregir warnings/errors que aparezcan del scaffold inicial de `create-next-app`)
- [ ] T020 [US2] Verificar que `pnpm typecheck` pasa con `tsc --noEmit` (sin errores de tipo en el scaffold)
- [ ] T021 [US2] Verificar que `pnpm test:run` ejecuta los smoke tests y pasan
- [ ] T022 [US2] Ejecutar `pnpm quality` y confirmar que los tres pasos (lint, typecheck, test:run) se ejecutan en secuencia y el comando termina con exit code 0

---

## Phase 5: User Story 4 — Variables de entorno documentadas y seguras (P1)

**Goal**: `.env.example` lista las 10 variables requeridas con descripciones; `.env.local` está en `.gitignore`.

**Independent Test**: `cat .env.example` muestra las 10 variables. `grep ".env.local" .gitignore` da match.

### Implementation for US4

- [ ] T023 [US4] Crear `.env.example` con las 10 variables de architecture.md §8: DATABASE_URL, AUTH_SECRET, AUTH_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, RESEND_API_KEY, SENTRY_DSN, RATE_LIMIT_STORE_URL — cada una con `# Descripción del propósito` como comentario y valor vacío o placeholder descriptivo
- [ ] T024 [US4] Verificar `.gitignore` incluye `.env.local`, `.env*.local`, `node_modules/`, `.next/`, `coverage/`, `dist/`, `playwright-report/`, `test-results/` — añadir los que falten
- [ ] T025 [US4] Test unitario en `tests/unit/env-example.test.ts`: verifica que `.env.example` existe, contiene las 10 variables esperadas, y sus valores son placeholders (no contienen secrets reales — regex para detectar `sk-`, `eyJ`, `https://`, etc.)

---

## Phase 6: User Story 3 — Hooks de git que protegen la rama (P2)

**Goal**: Husky instalado con pre-commit (lint + typecheck) y pre-push (test:run + build). Commits con errores son rechazados.

**Independent Test**: Crear archivo con error de typecheck, `git commit` → rechazado.

### Implementation for US3

- [ ] T026 [US3] Instalar Husky: verificar `.git` existe, ejecutar `pnpm exec husky init`, configurar `pre-commit` hook: `pnpm lint && pnpm typecheck`, configurar `pre-push` hook: `pnpm test:run && pnpm build`
- [ ] T027 [US3] Verificar hook pre-commit funcional: crear archivo temporal con error de TypeScript, intentar commit → debe ser rechazado. Limpiar archivo temporal.
- [ ] T028 [US3] Verificar hook pre-push funcional: simular test fail → push rechazado (opcional si hay remote configurado; si no, verificar que el script del hook existe y es ejecutable)

---

## Phase 7: Polish & cross-cutting concerns

**Goal**: Documentación, build de producción, y verificación final completa.

**Independent Test**: `pnpm build` exitoso. `README.md` contiene instrucciones de instalación.

- [ ] T029 [P] Crear `README.md` con: nombre del proyecto (Domio), descripción breve, prerequisitos (Node ≥20, pnpm), instrucciones de instalación (`corepack enable && pnpm install`), scripts disponibles (tabla con descripciones)
- [ ] T030 [P] Crear `.gitignore` si no existe ya, asegurando cobertura de: `node_modules/`, `.next/`, `.env.local`, `.env*.local`, `coverage/`, `dist/`, `*.tsbuildinfo`, `playwright-report/`, `test-results/`, `.DS_Store`
- [ ] T031 Ejecutar `pnpm verify` (quality + test:contract + test:e2e + build) — todo debe pasar con exit code 0
- [ ] T032 Ejecutar `pnpm build` y verificar que la carpeta `.next/` se genera, que el build es exitoso, y que el tamaño del bundle es razonable (< 500KB para una página vacía)

---

## Dependencies & Execution Order

```
Phase 1 (Setup)
  └─ T001 → T002 → T003

Phase 2 (Foundational) — all [P], can run in parallel after Phase 1
  └─ T004, T005, T006, T007, T008, T009, T010 (parallel)

Phase 3 (US1+US5) — depends on T001-T003, T006
  └─ T011, T012 (parallel) → T013 → T014, T015, T016, T017 (parallel)

Phase 4 (US2) — depends on T004, T010
  └─ T018 → T019, T020, T021 → T022

Phase 5 (US4) — depends on T001
  └─ T023 → T024, T025 (parallel)

Phase 6 (US3) — depends on T004, T006, T010
  └─ T026 → T027 → T028

Phase 7 (Polish) — depends on all previous phases
  └─ T029, T030 (parallel) → T031 → T032
```

## Parallel Opportunities

- **Phase 2**: T004–T010 son todos [P] (archivos de configuración independientes)
- **Phase 3**: T011 y T012 son [P] (tests en archivos distintos)
- **Phase 5**: T024 y T025 son [P]
- **Phase 7**: T029 y T030 son [P]

## Implementation Strategy

### MVP (Minimum Viable Product): Phase 1 + Phase 2 + Phase 3
Un scaffold de Next.js arrancable con estructura de carpetas correcta. Entrega valor inmediato: cualquier desarrollador puede clonar, instalar, y arrancar.

### Incremental Delivery
1. **MVP** (Fases 1-3): `pnpm dev` arranca, estructura de carpetas existe
2. **+Quality** (Fase 4): `pnpm quality` funciona como comando único de verificación
3. **+Env** (Fase 5): `.env.example` documenta todas las variables requeridas
4. **+Hooks** (Fase 6): Husky protege commits y pushes
5. **+Polish** (Fase 7): README, build, verificación final

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 32 |
| Phase 1 (Setup) | 3 |
| Phase 2 (Foundational) | 7 |
| Phase 3 (US1+US5 — Scaffold) | 7 |
| Phase 4 (US2 — Quality) | 5 |
| Phase 5 (US4 — Env vars) | 3 |
| Phase 6 (US3 — Git hooks) | 3 |
| Phase 7 (Polish) | 4 |
| Parallel tasks [P] | 17 |
| User stories covered | 5/5 |
| Independent test criteria | 5 (one per phase/story) |
