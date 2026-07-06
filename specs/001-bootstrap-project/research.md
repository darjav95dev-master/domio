# Research: Bootstrap del proyecto

**Feature**: F001 · bootstrap-project
**Date**: 2026-07-06

## Decision Log

### D1: Scaffold inicial — `create-next-app` vs manual

**Decision**: Usar `create-next-app` con flags y luego ajustar manualmente.

**Rationale**: `create-next-app` genera la estructura base de Next.js 15 con App Router, TypeScript, y Tailwind correctamente. Luego se aplican ajustes manuales (ESLint flat config, Vitest, Playwright, Husky, estructura de carpetas extendida) porque `create-next-app` no cubre estos toolings adicionales ni la estructura de dominio del proyecto.

**Alternatives considered**:
- Manual completo desde `mkdir` — más control pero más propenso a errores de configuración de Next.js.
- Template personalizado — no es mantenible a largo plazo para F001.

### D2: ESLint config — flat config (eslint.config.mjs) vs legacy (.eslintrc)

**Decision**: Usar ESLint flat config (`eslint.config.mjs`).

**Rationale**: Next.js 15 y ESLint 9+ adoptan flat config como estándar. Es el formato futuro y el recomendado por el ecosistema. Los plugins `@typescript-eslint`, `sonarjs`, y `jsx-a11y` ya soportan flat config.

### D3: Vitest config — `singleFork: true` y `fileParallelism: false`

**Decision**: Configurar Vitest con execution isolation completa.

**Rationale**: Constitution §12 exige límites operacionales para el host de desarrollo. `singleFork: true` asegura que los tests se ejecuten en un solo worker, y `fileParallelism: false` evita condiciones de carrera entre archivos de test. Esto es conservador pero garantiza consistencia en entornos con recursos limitados.

### D4: Playwright — `workers: 1` y `fullyParallel: false`

**Decision**: Playwright con un solo worker y ejecución secuencial.

**Rationale**: Misma justificación que D3 (constitution §12). En un entorno de CI/desarrollo con recursos limitados, un solo worker de Playwright evita timeouts y flaky tests por contención de recursos.

### D5: Coverage thresholds al 80%

**Decision**: Vitest coverage: statements, branches, functions, lines — todos al 80%.

**Rationale**: Constitution §3 exige TDD y cobertura medible. El 80% es un estándar de industria que balancea exigencia con pragmatismo. En esta feature bootstrap, la cobertura será baja porque no hay lógica de dominio — el threshold aplica a features posteriores.

### D6: Husky — `git init` antes de instalar

**Decision**: Verificar que `.git` existe antes de ejecutar `husky install`; si no, ejecutar `git init` primero.

**Rationale**: Constitution §9 exige Husky pero no asume que `git init` ya se ejecutó. En un scaffold desde cero, `create-next-app` inicializa git, pero si se clona desde un template sin `.git`, Husky fallaría. La verificación explícita es defensiva.

### D7: Variables de entorno — `.env.example` con las 10 variables de architecture.md §8

**Decision**: Listar DATABASE_URL, AUTH_SECRET, AUTH_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, RESEND_API_KEY, SENTRY_DSN, RATE_LIMIT_STORE_URL sin valores reales, con descripción del propósito de cada una.

**Rationale**: Constitution §5 exige documentación de variables y protección de secretos. Architecture.md §8 define el conjunto completo. Tenerlas desde F001 evita que cada feature futura tenga que adivinar qué variables existen.
