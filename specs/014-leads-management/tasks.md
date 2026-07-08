# Tasks: Leads Management

**Input**: Design documents from `/specs/014-leads-management/`

**Tests**: TDD approach.

## Phase 1: Setup

- [ ] T001 Verificar tablas y RLS policies existentes para leads en schema de BD

## Phase 2: Foundational

- [ ] T002 Write failing integration tests for LeadRepository in `tests/integration/lead-operations.test.ts`
- [ ] T003 Write failing unit tests for lead validation in `tests/unit/lead-validation.test.ts`
- [ ] T004 Implement LeadRepository in `src/infrastructure/db/repositories/lead.repository.ts` — findAll, findById, updateStatus, addNote, markAsRead, getUnreadCount, reassign, exportCsv
- [ ] T005 Implement Zod schemas for lead validation in `src/shared/types/lead-schema.ts`
- [ ] T006 Implement state transition validation logic in LeadRepository

**Checkpoint**: Repository + validation ready. Tests green.

## Phase 3: US1 — Bandeja con filtros (P1) 🎯 MVP

- [ ] T007 [US1] Create server actions for leads listing in `src/features/leads/actions/leads.actions.ts`
- [ ] T008 [P] [US1] Create `LeadsTable` component in `src/features/leads/components/leads-table.tsx`
- [ ] T009 [P] [US1] Create `LeadStatusBadge` component in `src/features/leads/components/lead-status-badge.tsx`
- [ ] T010 [US1] Create leads listing page in `app/(auth)/panel/leads/page.tsx`

**Checkpoint**: Bandeja funcional con filtros y scope por agente.

## Phase 4: US2 — Detalle y notas (P1)

- [ ] T011 [US2] Create server actions for lead detail, notes, and markAsRead in `src/features/leads/actions/leads.actions.ts`
- [ ] T012 [US2] Create `LeadDetail` component in `src/features/leads/components/lead-detail.tsx`
- [ ] T013 [US2] Create lead detail page in `app/(auth)/panel/leads/[id]/page.tsx`

**Checkpoint**: Detalle funcional con notas y marca de leído.

## Phase 5: US3 — Máquina de estados (P1)

- [ ] T014 [US3] Integrate status change UI into LeadDetail component in `src/features/leads/components/lead-detail.tsx`
- [ ] T015 [US3] Add status transition server action in `src/features/leads/actions/leads.actions.ts`
- [ ] T016 [US3] Show history timeline in LeadDetail

**Checkpoint**: Máquina de estados funcional con histórico.

## Phase 6: US4 — Reasignación y CSV (P2)

- [ ] T017 [US4] Create reassign server action in `src/features/leads/actions/leads.actions.ts`
- [ ] T018 [US4] Add reassign UI (admin only) in `src/features/leads/components/lead-detail.tsx`
- [ ] T019 [US4] Create CSV export server action in `src/features/leads/actions/leads.actions.ts`
- [ ] T020 [US4] Add export button in leads listing page

**Checkpoint**: Reasignación y exportación funcionales.

## Phase 7: Polish

- [ ] T021 Run `pnpm vitest run --reporter=dot` and verify all tests pass
- [ ] T022 Run `pnpm typecheck` and fix errors
- [ ] T023 Run `pnpm lint` on modified files
- [ ] T024 Run quickstart.md validation
- [ ] T025 Code cleanup

## Dependencies

- Phase 2 blocks all user stories
- US1 → US2 → US3 (secuencial, cada uno construye sobre el anterior)
- US4 independiente de US3

## MVP: US1 only

1. Phase 1-2: Foundation
2. Phase 3: US1 (bandeja + filtros)
3. STOP and VALIDATE
