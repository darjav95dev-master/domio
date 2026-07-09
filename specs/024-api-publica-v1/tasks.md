# Tasks: api-publica-v1

**Input**: Design documents from `/specs/024-api-publica-v1/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: TDD obligatorio según constitution.md §3. Contract tests en tests/contract/v1/.

**Organization**: Tasks grouped by user story. US1 (P1) es GET promociones, US2 (P1) es POST leads.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Crear estructura de directorios src/features/api-public/middleware/, src/features/api-public/schemas/, src/features/api-public/server/, src/features/api-public/serializers/, tests/contract/v1/

---

## Phase 2: Foundational (Auth + Schemas)

**Purpose**: Middleware de autenticación por API key, schemas Zod compartidos.

- [ ] T002 Implementar middleware de autenticación por API key en src/features/api-public/middleware/api-key-auth.ts: resuelve API key desde header X-API-Key, verifica contra api_keys table (key_hash), establece ApiKeyContext, actualiza last_used_at.
- [ ] T003 Crear schema Zod de response para promoción en src/features/api-public/schemas/promocion-response.schema.ts: define estructura de respuesta (id, slug, nombre, tipo, operacion, precio, superficie, dormitorios, baños, municipio, isla, map_privacy_mode, location_approx, updated_at).
- [ ] T004 Crear schema Zod de request para lead institucional en src/features/api-public/schemas/lead-institutional.schema.ts: valida nombre, email, teléfono (opcional), mensaje, promocion_id, tipologia_id (opcional), consentimiento (legal_basis + text_accepted requeridos).

**Checkpoint**: Auth funcional, schemas validan correctamente.

---

## Phase 3: User Story 1 - GET /api/v1/promociones (Priority: P1) 🎯 MVP

**Goal**: Endpoint GET con cursor pagination, filtro obligatorio portfolio+PUBLISHED, serialización respetando map_privacy_mode, rate limiting.

**Independent Test**: GET con API key válida → 200 con lista portfolio+PUBLISHED. Verificar serialización AREA/EXACT. Rate limiting funcional.

### Implementation for User Story 1

- [ ] T005 [US1] Implementar función getPromociones en src/features/api-public/server/get-promociones.ts: consulta con ApiKeyContext (filtro kind='portfolio' + status='PUBLISHED'), cursor pagination (cursor codifica updated_at + id), límite configurable (default 20, max 100).
- [ ] T006 [US1] Implementar serializador serializePromocion en src/features/api-public/serializers/promocion-serializer.ts: si map_privacy_mode='AREA', omite campo location y solo devuelve location_approx. Si EXACT, incluye ambos.
- [ ] T007 [US1] Crear route handler GET /api/v1/promociones en app/api/v1/promociones/route.ts: usa middleware de auth, llama a getPromociones, serializa responses, aplica rate limiting, retorna JSON con cursor pagination.
- [ ] T008 [P] [US1] Crear contract test para response de GET /api/v1/promociones en tests/contract/v1/promocion-response.contract.spec.ts: verifica que responses cumplen schema Zod, serialización respeta map_privacy_mode, cursor pagination funcional.

**Checkpoint**: GET funcional con auth, pagination, serialización, rate limiting, contract tests.

---

## Phase 4: User Story 2 - POST /api/v1/leads/institutional (Priority: P1)

**Goal**: Endpoint POST con validación Zod, consentimiento RGPD obligatorio, creación de lead en transacción atómica, email encolado.

**Independent Test**: POST con consentimiento válido → 201, lead creado, email encolado. Sin consentimiento → 422.

### Implementation for User Story 2

- [ ] T009 [US2] Implementar función createInstitutionalLead en src/features/api-public/server/create-institutional-lead.ts: valida con schema Zod, crea lead con source='institutional' en transacción atómica, crea consent_record, encola email de notificación en email_queue.
- [ ] T010 [US2] Crear route handler POST /api/v1/leads/institutional en app/api/v1/leads/institutional/route.ts: usa middleware de auth, valida payload con Zod, llama a createInstitutionalLead, retorna 201 o 422 con detalle de errores.
- [ ] T011 [P] [US2] Crear contract test para POST /api/v1/leads/institutional en tests/contract/v1/lead-institutional.contract.spec.ts: verifica que payload válido → 201, sin consentimiento → 422, email encolado.

**Checkpoint**: POST funcional con auth, validación, consentimiento, transacción atómica, email queue, contract tests.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T012 Verificar rate limiting por API key (test: múltiples requests → 429 tras superar límite).
- [ ] T013 Verificar degradación graceful: si Redis falla, se alerta pero no se bloquea request.
- [ ] T014 Verificar que contract tests bloquean cambios incompatibles (modificar schema y verificar que test falla).
- [ ] T015 Ejecutar quickstart.md validation scenarios.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup. T002, T003, T004 en paralelo.
- **US1 (Phase 3)**: Depends on Foundational. T005 → T006 → T007 (secuencial), T008 en paralelo.
- **US2 (Phase 4)**: Depends on Foundational. T009 → T010 (secuencial), T011 en paralelo.
- **Polish (Phase 5)**: Depends on US1 y US2.

### Parallel Opportunities

- T002, T003, T004 en paralelo
- T008 en paralelo con T005-T007
- T011 en paralelo con T009-T010
- US1 y US2 pueden ir en paralelo tras Foundational

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1-2: Setup + Foundational
2. Phase 3: US1 (GET promociones)
3. **STOP and VALIDATE**: GET funcional
4. Phase 4: US2 (POST leads)
5. Phase 5: Polish

---

## Notes

- Middleware de auth se aplica a todos los endpoints /api/v1/*.
- ApiKeyContext aplica filtro a nivel de repositorio, no de endpoint.
- Serializador es el punto de control para map_privacy_mode antes de enviar JSON.
- Cursor pagination codifica (updated_at, id) para estabilidad.
- Consentimiento es obligatorio en POST leads (422 si falta).
- Emails se encolan en email_queue, nunca se envían directamente.
- Rate limiting por API key con degradación graceful si Redis falla.
- Contract tests en tests/contract/v1/ con schemas Zod versionados.
