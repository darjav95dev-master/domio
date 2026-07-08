# Tasks: RGPD Compliance

## Phase 1: Setup
- [ ] T001 Verificar tablas consent_records y arsop_requests en schema

## Phase 2: Foundational
- [ ] T002 Write failing tests for consent validation in tests/unit/consent-validation.test.ts
- [ ] T003 Write failing tests for consent operations in tests/integration/consent-operations.test.ts
- [ ] T004 Write failing tests for ARSOP operations in tests/integration/arsop-operations.test.ts
- [ ] T005 Implement Zod schemas in src/shared/types/consent-schema.ts
- [ ] T006 Implement ConsentRepository in src/infrastructure/db/repositories/consent.repository.ts
- [ ] T007 Implement ArsopRepository in src/infrastructure/db/repositories/arsop.repository.ts (export + cascade delete)

## Phase 3: US1 — Consentimiento RGPD (P1) 🎯 MVP
- [ ] T008 [US1] Integrate consent validation in lead creation flow (form + API)
- [ ] T009 [US1] Add consent checkbox to public contact form
- [ ] T010 [US1] Add consent validation to API POST /api/v1/leads/institutional

## Phase 4: US2 — Exportación ARSOP (P1)
- [ ] T011 [US2] Create exportLeadAction server action in src/features/leads/actions/arsop.actions.ts
- [ ] T012 [US2] Create ArsopButtons component (Export + Delete) in src/features/leads/components/arsop-buttons.tsx
- [ ] T013 [US2] Integrate ArsopButtons in lead detail page (ADMIN only)

## Phase 5: US3 — Borrado ARSOP (P1)
- [ ] T014 [US3] Create deleteLeadAction server action in src/features/leads/actions/arsop.actions.ts
- [ ] T015 [US3] Wire delete action to ArsopButtons with confirmation dialog

## Phase 6: US4 — Trazabilidad (P2)
- [ ] T016 [US4] Verify arsop_requests records created for export and delete
- [ ] T017 [US4] Write immutability tests for consent_records and arsop_requests

## Phase 7: Polish
- [ ] T018 Run all tests, typecheck, lint
- [ ] T019 Quickstart validation
- [ ] T020 Code cleanup

## MVP: US1 (consentimiento) + US2 (export) + US3 (delete)
