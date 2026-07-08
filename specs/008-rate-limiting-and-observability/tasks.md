# Tasks: Rate Limiting & Observability

**Input**: Design documents from `specs/008-rate-limiting-and-observability/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: TDD obligatorio — constitution.md §3 exige RED → GREEN → REFACTOR para toda lógica de negocio.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Instalar dependencias y crear la estructura de carpetas para los módulos de rate limiting y observabilidad.

- [ ] T001 Instalar dependencias: `pnpm add @upstash/redis @sentry/nextjs` y verificar que compilan con `pnpm typecheck`
- [ ] T002 [P] Crear estructura de carpetas: `src/infrastructure/rate-limiting/`, `src/infrastructure/observability/`, y `src/shared/components/` (este último ya existe)
- [ ] T003 [P] Definir constantes de rate limiting en `src/shared/constants/rate-limits.ts`: `DEFAULT_API_LIMIT_PER_MIN`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MINUTES`, `CONTACT_MAX_ATTEMPTS`, `CONTACT_WINDOW_MINUTES`, `LOCKOUT_MINUTES`

**Checkpoint**: Dependencias instaladas, carpetas creadas, constantes definidas.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Módulo de rate limiter con su interfaz y tests. Este módulo es la base que consumen US1 y US2.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Crear tipos del rate limiter en `src/infrastructure/rate-limiting/rate-limiter.types.ts`: interfaces `RateLimitConfig`, `RateLimitResult`, `RateLimiter`
- [ ] T005 [P] Crear factory del rate limiter en `src/infrastructure/rate-limiting/rate-limiter.factory.ts`: función `createRateLimiter()` que devuelve instancia con Upstash o no-op si `RATE_LIMIT_STORE_URL` no está definida
- [ ] T006 Implementar rate limiter con Upstash en `src/infrastructure/rate-limiting/rate-limiter.ts`: método `consume()` con sliding window counter, try/catch para degradación graceful (return `{ allowed: true }` + log warn en error)
- [ ] T007 Escribir tests unitarios del rate limiter en `src/infrastructure/rate-limiting/rate-limiter.spec.ts`: mock de `@upstash/redis`, tests para: allow under limit, deny over limit, graceful degradation on store error, sliding window calculation

**Checkpoint**: Rate limiter funcional con tests en verde. Interfaz `RateLimiter` lista para consumir.

---

## Phase 3: User Story 1 — Rate Limiting por API Key (Priority: P1) 🎯 MVP

**Goal**: Proteger `/api/v1/*` con rate limiting basado en API key. Los límites se leen de `api_keys.rate_limit_per_min`.

**Independent Test**: Una API key con `rate_limit_per_min = 5` hace 6 requests rápidas a `/api/v1/*`; la 6ª recibe 429 con headers `X-RateLimit-*`.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [US1] Test de integración: middleware de rate limiting por API key en `src/infrastructure/rate-limiting/api-key-middleware.spec.ts` — mock de Upstash, verificar: allow under limit, deny over limit, headers X-RateLimit-* en respuesta, degradación graceful

### Implementation for User Story 1

- [ ] T009 [US1] Implementar middleware de rate limiting por API key en `src/infrastructure/rate-limiting/api-key-middleware.ts`: lee `rate_limit_per_min` de la API key autenticada (o default si NULL), invoca `rateLimiter.consume()`, setea headers `X-RateLimit-Limit/Remaining/Reset`, retorna 429 con body `{ error, retryAfter }` si excede
- [ ] T010 [US1] Integrar middleware en route handlers de `/api/v1/` — crear helper `withRateLimit(handler)` en `src/features/api-public/with-rate-limit.ts` que envuelve el route handler y aplica el middleware antes de la lógica de negocio

**Checkpoint**: API key con límite 5 → 6ª request recibe 429. Headers presentes en toda respuesta. Degradación graceful verificada.

---

## Phase 4: User Story 2 — Rate Limiting por IP en Endpoints Sensibles (Priority: P2)

**Goal**: Proteger login y formulario de contacto con rate limiting por IP. Bloqueo temporal tras exceder límite.

**Independent Test**: Una IP hace 6 intentos de login fallidos; el 6º recibe 429. Tras esperar el lockout, puede reintentar.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [US2] Test de integración: rate limiting por IP en login en `src/infrastructure/rate-limiting/ip-rate-limit.spec.ts` — mock de Upstash, verificar: allow under limit, deny over limit, lockout tras exceder, reset tras ventana

### Implementation for User Story 2

- [ ] T012 [US2] Implementar helper de rate limiting por IP en `src/infrastructure/rate-limiting/ip-rate-limit.ts`: función `checkIpRateLimit(ip, scope)` que usa el rate limiter con config de login o contacto según el scope. Maneja lockout (clave Redis con TTL de lockout).
- [ ] T013 [US2] Integrar rate limiting por IP en el callback de credentials de Auth.js en `src/infrastructure/auth/rate-limit-login.ts`: extraer IP del request, invocar `checkIpRateLimit(ip, 'login')`, retornar 429 si excede. Integrar en la configuración de Auth.js.
- [ ] T014 [US2] Integrar rate limiting por IP en la server action del formulario de contacto en `src/features/contact/contact-form-action.ts` (o ruta equivalente): extraer IP del request, invocar `checkIpRateLimit(ip, 'contact')`, retornar error si excede.

**Checkpoint**: Login bloquea tras 5 intentos por IP en 15 min. Contacto bloquea tras 3 envíos por IP en 10 min. Lockout se resetea tras el TTL.

---

## Phase 5: User Story 3 — Sentry con tenant_id (Priority: P3)

**Goal**: Configurar Sentry client + serverless con inyección de `tenant_id` en cada evento. Filtrado de secrets.

**Independent Test**: Lanzar un error dentro de un TenantContext → verificar en Sentry (o mock) que el tag `tenant_id` está presente.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [P] [US3] Test del wrapper de Sentry en `src/infrastructure/observability/sentry.wrapper.spec.ts`: mock de `@sentry/nextjs`, verificar: `captureError` llama a `Sentry.captureException` con tags correctos, `setTenantContext` setea tags, filtrado de secrets en `beforeSend`

### Implementation for User Story 3

- [ ] T016 [P] [US3] Configurar Sentry client-side en `sentry.client.config.ts`: DSN desde `process.env.NEXT_PUBLIC_SENTRY_DSN`, `tracesSampleRate` 0.1 prod / 1.0 dev, `beforeSend` y `beforeBreadcrumb` para filtrar secrets (regex: password, secret, token, api_key, authorization, cookie)
- [ ] T017 [P] [US3] Configurar Sentry server-side en `sentry.server.config.ts` y `instrumentation.ts`: DSN desde `process.env.SENTRY_DSN`, `tracesSampleRate` según entorno, registro de `beforeSend` para filtrado de secrets
- [ ] T018 [US3] Implementar wrapper de Sentry en `src/infrastructure/observability/sentry.wrapper.ts`: funciones `captureError(error, context?)`, `setTenantContext(context)`, `addBreadcrumb(message, data?)`. Si DSN no está definido, no-op silencioso. Inyecta `tenant_id`, `user_id`, `role`, `endpoint` como tags.
- [ ] T019 [US3] Integrar wrapper en middleware de tenant resolution: tras resolver el `TenantContext`, llamar a `setTenantContext()` para que los errores posteriores tengan el tag. Archivo: `src/infrastructure/tenant/sentry-integration.ts` o integración directa en el middleware existente.

**Checkpoint**: Error lanzado en contexto de tenant → Sentry recibe tag `tenant_id`. Sin DSN → no-op. Secrets filtrados en eventos.

---

## Phase 6: User Story 4 — Error Boundaries en React (Priority: P4)

**Goal**: Error boundary que captura errores de render, reporta a Sentry y muestra fallback digno.

**Independent Test**: Componente que lanza error en render → boundary muestra fallback con mensaje + botón "Reintentar". No pantalla en blanco.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T020 [US4] Test del ErrorBoundary en `src/shared/components/error-boundary.spec.tsx`: con @testing-library/react, verificar: captura error y renderiza fallback, fallback tiene `role="alert"`, botón "Reintentar" resetea el state, `onError` callback se invoca con el error

### Implementation for User Story 4

- [ ] T021 [US4] Implementar ErrorBoundary en `src/shared/components/error-boundary.tsx`: class component con `componentDidCatch` y `getDerivedStateFromError`. Fallback por defecto: mensaje "Algo salió mal al cargar esta página" + botón "Reintentar". Props: `fallback?`, `onError?`. A11y: `role="alert"`, `aria-live="polite"`.
- [ ] T022 [US4] Implementar global error handler en `app/global-error.tsx`: captura errores que escapan todos los boundaries. Reporta a Sentry vía `captureError()`. Renderiza fallback con su propio `<html>` y `<body>`.
- [ ] T023 [US4] Integrar ErrorBoundary en `app/layout.tsx`: envolver `{children}` con `<ErrorBoundary onError={captureError}>`. Verificar que el layout no rompe si el boundary captura un error.

**Checkpoint**: Error en componente → fallback visible. Error en layout raíz → global-error.tsx captura. Ambos reportan a Sentry.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Integración final, verificación de calidad y limpieza.

- [ ] T024 Verificar que `.env.example` declara `SENTRY_DSN` y `RATE_LIMIT_STORE_URL` (ya deberían estar — verificar)
- [ ] T025 [P] Ejecutar `pnpm lint` y `pnpm typecheck` sobre todos los archivos nuevos — corregir errores
- [ ] T026 Ejecutar `pnpm vitest run --reporter=dot` — todos los tests de la feature en verde
- [ ] T027 Verificar escenarios del quickstart.md (manual o semiautomático)
- [ ] T028 Code cleanup: eliminar imports no usados, verificar que no hay magic numbers fuera de constantes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T003). BLOCKS all user stories.
- **US1 — API Key Rate Limiting (Phase 3)**: Depends on Foundational (T004-T007)
- **US2 — IP Rate Limiting (Phase 4)**: Depends on Foundational (T004-T007). Independent of US1.
- **US3 — Sentry (Phase 5)**: Depends on Setup only (T001-T003). Independent of US1/US2.
- **US4 — Error Boundaries (Phase 6)**: Depends on US3 (T018 — usa `captureError` del wrapper). 
- **Polish (Phase 7)**: Depends on all user stories complete.

### User Story Dependencies

- **US1 (P1)**: Foundational → US1. No dependency on US2/US3/US4.
- **US2 (P2)**: Foundational → US2. No dependency on US1/US3/US4.
- **US3 (P3)**: Setup → US3. No dependency on US1/US2. Puede empezar en paralelo con US1/US2.
- **US4 (P4)**: US3 → US4. Depende del wrapper de Sentry (T018) para `captureError`.

### Parallel Opportunities

- T002, T003 en paralelo (Phase 1)
- T004, T005 en paralelo (Phase 2)
- T008 (test US1) se puede escribir en paralelo con T009 (implementación US1) — TDD: test primero
- T011 (test US2) en paralelo con T012
- T015 (test US3) en paralelo con T016, T017
- T016, T017 en paralelo (Sentry client y server config — archivos distintos)
- US1 y US2 en paralelo tras Foundational
- US3 en paralelo con US1/US2 (solo depende de Setup)

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1: Setup (T001-T003)
2. Phase 2: Foundational (T004-T007)
3. Phase 3: US1 — API Key Rate Limiting (T008-T010)
4. **STOP and VALIDATE**: Rate limiting por API key funciona con tests en verde
5. Commit parcial si está listo

### Incremental Delivery

1. Setup + Foundational → Rate limiter base listo
2. US1 → API pública protegida por key → MVP de rate limiting
3. US2 → Login y contacto protegidos por IP → protección completa
4. US3 → Sentry con tenant_id → observabilidad en producción
5. US4 → Error boundaries → resiliencia de UI
6. Polish → verificación final

---

## Notes

- TDD estricto: tests PRIMERO, luego implementación, luego refactor. Constitution.md §3.
- US3 (Sentry) puede empezar en paralelo con US1/US2 porque no depende del rate limiter.
- US4 (ErrorBoundary) depende de US3 porque usa `captureError` del wrapper de Sentry.
- La degradación graceful del rate limiter es crítica: si Upstash cae, la request SIEMPRE pasa.
- No se modifica el schema de BD en esta feature — `api_keys.rate_limit_per_min` ya existe.
