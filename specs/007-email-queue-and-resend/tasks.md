# Tasks: email-queue-and-resend

**Input**: Design documents from `specs/007-email-queue-and-resend/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: TDD obligatorio — constitución §3 exige RED → GREEN → REFACTOR para toda lógica de negocio.

**Organization**: Tareas agrupadas por user story para implementación y testing independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths included in descriptions

---

## Phase 1: Setup (Instalación y estructura)

**Purpose**: Instalar dependencia externa y crear la estructura de directorios del módulo email.

- [ ] T001 Instalar paquete `resend` con `pnpm add resend` y verificar que compila con `pnpm typecheck`
- [ ] T002 [P] Crear estructura de directorios `src/infrastructure/email/` y `src/infrastructure/email/templates/` y `tests/unit/email/` y `tests/integration/email/`
- [ ] T003 [P] Crear archivo de constantes y schemas Zod de payloads en `src/shared/constants/email-templates.ts` con `EMAIL_TEMPLATE_NAMES` y los 4 schemas de payload (lead-assigned-agent, lead-confirmation, team-invitation, password-recovery)

**Checkpoint**: Dependencia instalada, estructura creada, constantes definidas.

---

## Phase 2: Foundational (Infraestructura base)

**Purpose**: Tipos compartidos, repositorio de BD y cliente Resend — base que necesitan todas las user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 [P] Crear tipos compartidos del módulo email en `src/infrastructure/email/types.ts` (interfaces EmailTemplate, EmailTemplateContent, ResendClient, WorkerResult, EmailProviderError)
- [ ] T005 [P] Crear repositorio de acceso a BD para email_queue en `src/infrastructure/email/email.repository.ts` con métodos: findPendingEligible(limit), markSent(id), markFailed(id, error), markRetry(id, error, nextAttemptAt) — todos operan sobre el schema Drizzle existente (`src/infrastructure/db/schema/email-queue.ts`)
- [ ] T006 Crear cliente Resend en `src/infrastructure/email/resend.client.ts` que implementa la interfaz ResendClient: método `send()` que invoca `resend.emails.send()`, valida `RESEND_API_KEY` al construir, lanza `EmailProviderError` en fallo

**Checkpoint**: Repositorio y cliente listos. Las user stories pueden comenzar.

---

## Phase 3: User Story 1 — Encolado resiliente (Priority: P1) 🎯 MVP

**Goal**: Un servicio de encolado que persiste notificaciones en `email_queue` dentro de la transacción del recurso de origen. Si Resend está caído, el recurso se persiste igualmente.

**Independent Test**: Invocar el servicio de encolado con Resend mockeado a lanzar excepción → la fila se persiste en `email_queue` con `status = PENDING`.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T007 [US1] Escribir test RED: "enqueue creates PENDING row in email_queue" en `tests/unit/email/email.service.test.ts` — verifica que tras enqueue, existe fila con status PENDING, attempts 0, to_email y template correctos
- [ ] T008 [US1] Escribir test RED: "enqueue works within existing transaction" en `tests/unit/email/email.service.test.ts` — verifica que enqueue recibe un transaction handle y no hace commit propio
- [ ] T009 [US1] Escribir test RED: "enqueue validates email format" en `tests/unit/email/email.service.test.ts` — verifica que email inválido lanza ValidationError
- [ ] T010 [US1] Escribir test RED: "enqueue validates payload against template schema" en `tests/unit/email/email.service.test.ts` — verifica que payload incompleto lanza ValidationError
- [ ] T011 [US1] Escribir test RED: "enqueue rejects unknown template" en `tests/unit/email/email.service.test.ts` — verifica que template no registrado lanza TemplateNotFoundError

### Implementation for User Story 1

- [ ] T012 [US1] Implementar EmailService en `src/infrastructure/email/email.service.ts` con método `enqueue()` que: valida email con zod, valida template registrado, valida payload contra schema del template, inserta fila en email_queue con status PENDING. Recibe optional transaction handle para integrarse en transacción existente.
- [ ] T013 [US1] Ejecutar tests de US1 → todos deben pasar (GREEN). Refactorizar si es necesario.

**Checkpoint**: El encolado funciona. Fila se persiste independientemente de Resend. Tests en verde.

---

## Phase 4: User Story 2 — Procesamiento de cola por el worker (Priority: P1)

**Goal**: Worker que procesa la cola `email_queue`: recoge PENDING elegibles, invoca Resend, aplica backoff exponencial tras fallo, marca FAILED tras 5 intentos.

**Independent Test**: Insertar fila PENDING, ejecutar worker con Resend mockeado → fila queda SENT. Insertar fila PENDING, ejecutar worker con Resend mockeado a fallar → fila queda PENDING con attempts incrementado y next_attempt_at recalculado.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [US2] Escribir test RED: "worker processes pending email and marks as SENT" en `tests/unit/email/worker.test.ts` — fila PENDING con template válido → tras process, status SENT, sent_at no null, attempts 1
- [ ] T015 [US2] Escribir test RED: "worker applies exponential backoff after failure" en `tests/unit/email/worker.test.ts` — Resend falla → attempts incrementado, next_attempt_at = now() + 2^attempts × 60s
- [ ] T016 [US2] Escribir test RED: "worker marks FAILED after 5 attempts" en `tests/unit/email/worker.test.ts` — 5º fallo consecutivo → status FAILED, no más reintentos
- [ ] T017 [US2] Escribir test RED: "worker uses FOR UPDATE SKIP LOCKED to prevent double processing" en `tests/unit/email/worker.test.ts` — verifica que la query de reclamación usa bloqueo (test de integración con BD real o mock del repositorio)
- [ ] T018 [US2] Escribir test RED: "worker returns WorkerResult with counts" en `tests/unit/email/worker.test.ts` — verifica que processQueue retorna { processed, sent, failed, retried }

### Implementation for User Story 2

- [ ] T019 [US2] Implementar lógica de procesamiento en `src/infrastructure/email/worker.ts`: función `processQueue(db, resendClient)` que reclama filas con findPendingEligible (FOR UPDATE SKIP LOCKED), para cada fila renderiza template, invoca Resend, y actualiza estado (SENT/FAILED/retry con backoff). Retorna WorkerResult.
- [ ] T020 [US2] Implementar cálculo de backoff exponencial en `src/infrastructure/email/worker.ts`: función `calculateNextAttempt(attempts)` que retorna `Date` con `now() + 2^attempts × 60_000` ms.
- [ ] T021 [US2] Ejecutar tests de US2 → todos deben pasar (GREEN). Refactorizar si es necesario.

**Checkpoint**: El worker procesa la cola correctamente. Backoff funciona. Doble envío prevenido. Tests en verde.

---

## Phase 5: User Story 3 — Templates transaccionales (Priority: P2)

**Goal**: Cuatro templates de email transaccional funcionales que producen subject, html y text con variables sustituidas.

**Independent Test**: Renderizar cada template con payload válido → contenido no vacío con variables sustituidas. Renderizar con payload inválido → error de validación.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [P] [US3] Escribir test RED: "lead-assigned-agent template renders with valid payload" en `tests/unit/email/templates.test.ts`
- [ ] T023 [P] [US3] Escribir test RED: "lead-confirmation template renders with valid payload" en `tests/unit/email/templates.test.ts`
- [ ] T024 [P] [US3] Escribir test RED: "team-invitation template renders with valid payload" en `tests/unit/email/templates.test.ts`
- [ ] T025 [P] [US3] Escribir test RED: "password-recovery template renders with valid payload" en `tests/unit/email/templates.test.ts`
- [ ] T026 [US3] Escribir test RED: "template rejects invalid payload" en `tests/unit/email/templates.test.ts` — verifica que payload que no cumple schema Zod produce error

### Implementation for User Story 3

- [ ] T027 [P] [US3] Implementar template `lead-assigned-agent` en `src/infrastructure/email/templates/lead-assigned-agent.ts` — renderiza HTML con nombre del agente, lead, promoción y enlace al backoffice
- [ ] T028 [P] [US3] Implementar template `lead-confirmation` en `src/infrastructure/email/templates/lead-confirmation.ts` — renderiza HTML de confirmación al lead
- [ ] T029 [P] [US3] Implementar template `team-invitation` en `src/infrastructure/email/templates/team-invitation.ts` — renderiza HTML con enlace de establecimiento de contraseña
- [ ] T030 [P] [US3] Implementar template `password-recovery` en `src/infrastructure/email/templates/password-recovery.ts` — renderiza HTML con enlace de reset y aviso de caducidad
- [ ] T031 [US3] Crear registry de templates en `src/infrastructure/email/templates/index.ts` que mapea nombre → template y expone función `getTemplate(name)` y `getAllTemplateNames()`
- [ ] T032 [US3] Ejecutar tests de US3 → todos deben pasar (GREEN). Refactorizar si es necesario.

**Checkpoint**: Los 4 templates renderizan contenido funcional. Registry operativo. Tests en verde.

---

## Phase 6: User Story 4 — Modalidad operativa del worker (Priority: P2)

**Goal**: Worker ejecutable como script standalone (`pnpm worker:emails`) en desarrollo y como handler serverless en producción.

**Independent Test**: Ejecutar `pnpm worker:emails` → worker arranca, procesa un ciclo, responde a SIGTERM. Verificar que el handler serverless exporta una función compatible con Vercel cron.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T033 [US4] Escribir test RED: "standalone worker processes one cycle and exits on SIGTERM" en `tests/unit/email/worker-standalone.test.ts` — verifica que el script arranca, procesa, y termina limpiamente

### Implementation for User Story 4

- [ ] T034 [US4] Crear script standalone en `scripts/worker-emails.ts` — entry point que importa processQueue del worker, crea conexión DB y cliente Resend, ejecuta en bucle con intervalo configurable (default 30s), maneja SIGTERM para shutdown limpio
- [ ] T035 [US4] Crear handler serverless en `src/infrastructure/email/worker-handler.ts` — función que exporta un handler compatible con Vercel cron trigger, invoca processQueue una vez y retorna WorkerResult como JSON
- [ ] T036 [US4] Añadir script `worker:emails` al `package.json` que ejecuta `tsx scripts/worker-emails.ts`
- [ ] T037 [US4] Ejecutar tests de US4 → todos deben pasar (GREEN). Verificar manualmente que `pnpm worker:emails` arranca (si BD disponible).

**Checkpoint**: Worker ejecutable en ambas modalidades. Tests en verde.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Integración final, tests de integración y verificación de calidad.

- [ ] T038 Crear test de integración en `tests/integration/email/email-queue.integration.test.ts` que verifica el flujo completo: encolado → procesamiento → SENT, y encolado → procesamiento con fallo → backoff → FAILED tras 5 intentos
- [ ] T039 Verificar que `pnpm lint` pasa limpio en todos los archivos nuevos
- [ ] T040 Verificar que `pnpm typecheck` pasa sin errores
- [ ] T041 Verificar que `pnpm test:run` pasa todos los tests (unit + integration del módulo email)
- [ ] T042 Ejecutar validación de quickstart.md — verificar que los 6 escenarios descritos son reproducibles

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001, T002, T003)
- **US1 (Phase 3)**: Depends on Foundational (T004, T005, T006)
- **US2 (Phase 4)**: Depends on Foundational + US1 (necesita EmailService para el flujo completo del worker)
- **US3 (Phase 5)**: Depends on Foundational (puede ejecutarse en paralelo con US2 — los templates son independientes del worker)
- **US4 (Phase 6)**: Depends on US2 (necesita la lógica de processQueue implementada)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Foundational → US1. Independiente.
- **US2 (P1)**: Foundational → US1 → US2. Depende de US1 porque el worker consume lo que US1 encola.
- **US3 (P2)**: Foundational → US3. Independiente de US1 y US2. Puede ejecutarse en paralelo con US2.
- **US4 (P2)**: Foundational → US2 → US4. Depende de US2 porque los entry points invocan processQueue.

### Within Each User Story

- Tests FIRST (RED) → Implementation (GREEN) → Refactor
- Constants/types before services
- Services before entry points

### Parallel Opportunities

- T002, T003 en Phase 1 (directorios y constantes)
- T004, T005 en Phase 2 (types y repository)
- T022, T023, T024, T025 en Phase 5 (tests de templates)
- T027, T028, T029, T030 en Phase 5 (implementación de templates)
- US3 completo puede ejecutarse en paralelo con US2

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (encolado resiliente)
4. Complete Phase 4: US2 (procesamiento de cola)
5. **STOP and VALIDATE**: El flujo completo funciona — encolar + procesar + enviar
6. Demo si está listo

### Incremental Delivery

1. Setup + Foundational → Base lista
2. US1 (encolado) → Test independently → ✅ Encolado funciona
3. US2 (worker) → Test independently → ✅ Envío funciona
4. US3 (templates) → Test independently → ✅ Contenido de emails correcto
5. US4 (modalidades) → Test independently → ✅ Worker ejecutable en dev y prod
6. Polish → Integración final

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story
- Cada user story es independientemente completable y testeable
- TDD estricto: tests FIRST (RED) → implementation (GREEN) → refactor
- Commit after each phase or logical group
- La tabla `email_queue` ya existe (F002) — no se necesita migración nueva
- El paquete `resend` es la única dependencia nueva
