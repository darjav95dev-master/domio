# Tasks: detalle-inmueble-engagement

**Input**: Design documents from `/specs/022-detalle-inmueble-engagement/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: TDD obligatorio según constitution.md §3.

**Organization**: Tasks grouped by user story. US1 (P1) es formulario, US2 (P2) WhatsApp, US3 (P3) compartir, US4 (P2) relacionados.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Crear estructura de directorios src/features/engagement/components/, src/features/engagement/server/, src/features/engagement/schemas/

---

## Phase 2: Foundational (Server Layer)

**Purpose**: Schema Zod compartido, server action para crear lead, consulta de relacionados.

- [ ] T002 Crear schema Zod compartido en src/features/engagement/schemas/contact-form.schema.ts con validación para nombre, email, teléfono (opcional), mensaje, tipología_id (opcional), consentimiento (boolean true requerido).
- [ ] T003 Implementar createLeadAction en src/features/engagement/server/create-lead-action.ts: valida con schema, crea lead + consentimiento en transacción atómica, encola emails (confirmación lead + notificación agente), aplica rate limiting por IP.
- [ ] T004 Implementar getRelatedProperties en src/features/engagement/server/get-related-properties.ts: consulta PostGIS con ST_DWithin (radio 5km), filtra por mismo tipo y precio ±20%, límite 4 resultados, solo PUBLISHED.
- [ ] T005 Implementar getContactConfig en src/features/engagement/server/get-contact-config.ts: obtiene whatsapp_number y whatsapp_prefilled_message de contact_config.

**Checkpoint**: Server layer lista. createLeadAction, getRelatedProperties, getContactConfig funcionales.

---

## Phase 3: User Story 1 - Formulario de contacto (Priority: P1) 🎯 MVP

**Goal**: Formulario de contacto con validación Zod, consentimiento RGPD, rate limiting.

**Independent Test**: Completar formulario con consentimiento → lead creado, emails encolados. Sin consentimiento → error visible.

### Implementation for User Story 1

- [ ] T006 [US1] Crear componente ContactForm en src/features/engagement/components/ContactForm.tsx: Client Component con campos nombre, email, teléfono, tipología (select opcional), mensaje, checkbox consentimiento con texto legal. Validación Zod en cliente. Uso de createLeadAction. Feedback de envío (loading, success, error). aria-live para mensajes.
- [ ] T007 [US1] Integrar ContactForm en app/(public)/inmuebles/[slug]/page.tsx en la posición adecuada (aside o sección de CTA).

**Checkpoint**: Formulario funcional con consentimiento.

---

## Phase 4: User Story 2 - Botón WhatsApp (Priority: P2)

**Goal**: Botón WhatsApp con mensaje predefinido. Genera lead si hay consentimiento previo.

**Independent Test**: Clic en WhatsApp → abre wa.me con mensaje predefinido. Si hay consentimiento en sesión → lead generado.

### Implementation for User Story 2

- [ ] T008 [US2] Crear componente WhatsAppButton en src/features/engagement/components/WhatsAppButton.tsx: Client Component. Enlace a wa.me con número y mensaje de contact_config. Si hay flag de consentimiento en sesión, dispara creación de lead con channel='WHATSAPP' vía server action.
- [ ] T009 [US2] Integrar WhatsAppButton en app/(public)/inmuebles/[slug]/page.tsx.

**Checkpoint**: WhatsApp funcional.

---

## Phase 5: User Story 3 - Botón compartir (Priority: P3)

**Goal**: Botón compartir que copia URL y proporciona OG tags.

**Independent Test**: Clic en compartir → URL copiada con feedback. OG tags presentes en head.

### Implementation for User Story 3

- [ ] T010 [US3] Crear componente ShareButton en src/features/engagement/components/ShareButton.tsx: Client Component. Web Share API nativa si disponible, fallback a clipboard. Feedback visual "Enlace copiado".
- [ ] T011 [US3] Integrar ShareButton en app/(public)/inmuebles/[slug]/page.tsx.

**Checkpoint**: Compartir funcional.

---

## Phase 6: User Story 4 - Inmuebles relacionados (Priority: P2)

**Goal**: Hasta 4 PropertyCards de misma zona, tipo y precio ±20%.

**Independent Test**: Ficha cargada muestra relacionados. Sin relacionados → sección oculta.

### Implementation for User Story 4

- [ ] T012 [US4] Crear componente RelatedProperties en src/features/engagement/components/RelatedProperties.tsx: renderiza hasta 4 PropertyCards (reutiliza de F020). Si no hay relacionados, no renderiza sección.
- [ ] T013 [US4] Integrar RelatedProperties en app/(public)/inmuebles/[slug]/page.tsx al pie de la ficha.

**Checkpoint**: Relacionados funcionales.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T014 Verificar Lighthouse Accessibility ≥90 en ficha con todos los componentes de engagement.
- [ ] T015 Verificar que emails se encolan correctamente en email_queue (test de integración).
- [ ] T016 Verificar rate limiting (test: 6 envíos → 429 en el sexto).
- [ ] T017 Ejecutar quickstart.md validation scenarios.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup
- **US1-US4 (Phases 3-6)**: All depend on Foundational. US1 es MVP. US2/US3/US4 pueden ir en paralelo tras US1.
- **Polish (Phase 7)**: Depends on all US

### Parallel Opportunities

- T002, T004, T005 en paralelo (archivos distintos)
- T008, T010, T012 en paralelo (componentes independientes)

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1-2: Setup + Foundational
2. Phase 3: US1 (formulario)
3. **STOP and VALIDATE**: Formulario funcional
4. Phases 4-6: US2-US4
5. Phase 7: Polish

---

## Notes

- ContactForm es Client Component (necesita estado para validación y envío).
- WhatsAppButton es Client Component (interactividad).
- ShareButton es Client Component (Web Share API / clipboard).
- RelatedProperties es Server Component (SSR, consulta en servidor).
- El flag de consentimiento para WhatsApp puede guardarse en una cookie httpOnly o en un estado de servidor (Next.js cache).
- createLeadAction usa 'use server' directive.
- Rate limiting usa el servicio de F008 (Upstash Redis).
