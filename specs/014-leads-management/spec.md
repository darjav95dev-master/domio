# Feature Specification: Leads Management

**Feature Branch**: `feature/014-leads-management`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Bandeja de leads en el backoffice: CRUD, máquina de estados (NEW→WON/LOST), marcas leído/no-leído por usuario, notas internas, scope por agente vía RLS, histórico inmutable, filtros, exportación CSV."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bandeja de leads con filtros (Priority: P1)

El agente autenticado accede a la bandeja de leads en `/panel/leads/` y ve un listado paginado de los leads que tiene asignados. El listado muestra nombre, email, teléfono, estado del lead, source (commercial/institutional), promoción asociada, fecha de creación y si está leído o no. Puede filtrar por estado del lead, source, rango de fechas, promoción asociada y búsqueda textual por nombre/email. Cada fila tiene un indicador visual de "no leído" (negrita o badge). El agente puede hacer clic en un lead para ver su detalle.

**Why this priority**: Sin bandeja no hay punto de entrada a la gestión de leads. Es la primera interacción del agente con sus leads asignados.

**Independent Test**: Se puede verificar accediendo a `/panel/leads/`, viendo los leads del seed, aplicando cada filtro y confirmando que los resultados son correctos.

**Acceptance Scenarios**:

1. **Given** el usuario es AGENT autenticado, **When** accede a `/panel/leads/`, **Then** ve solo los leads cuyo `assigned_agent_id` coincide con su user_id.
2. **Given** el usuario es ADMIN autenticado, **When** accede a `/panel/leads/`, **Then** ve todos los leads del tenant.
3. **Given** el usuario es OPERATOR autenticado, **When** intenta acceder a `/panel/leads/`, **Then** el sistema deniega el acceso (routing condicional por rol).
4. **Given** la bandeja muestra leads, **When** el agente filtra por estado=NEW, **Then** solo se muestran leads con estado NEW.
5. **Given** la bandeja muestra leads, **When** el agente filtra por source=commercial, **Then** solo se muestran leads con source commercial.
6. **Given** la bandeja muestra leads, **When** el agente busca por nombre "Juan", **Then** solo se muestran leads cuyo nombre contiene "Juan".
7. **Given** un lead no ha sido leído por el agente, **When** aparece en la bandeja, **Then** tiene un indicador visual de "no leído" (negrita o badge).

---

### User Story 2 - Detalle de lead y notas internas (Priority: P1)

El agente abre un lead y ve su detalle completo: datos de contacto, estado actual, source, promoción asociada, fecha de creación, notas internas y histórico de cambios. Puede añadir notas internas cronológicas que se guardan en `lead_notes`. Al abrir el lead, se registra automáticamente una marca de leído (`lead_read_marks`) para ese usuario, y el badge del nav se decrementa.

**Why this priority**: El detalle del lead es donde el agente trabaja con cada contacto. Las notas internas son esenciales para el seguimiento comercial.

**Independent Test**: Se puede verificar abriendo un lead, confirmando que se marca como leído, añadiendo notas y viendo el histórico.

**Acceptance Scenarios**:

1. **Given** el agente hace clic en un lead no leído, **When** se abre el detalle, **Then** se inserta/actualiza `read_at` en `lead_read_marks` para ese usuario y lead.
2. **Given** el agente abre un lead no leído, **When** vuelve a la bandeja, **Then** el badge de leads no leídos del nav se ha decrementado.
3. **Given** el agente está en el detalle de un lead, **When** escribe una nota y la guarda, **Then** la nota se persiste en `lead_notes` con timestamp y autor.
4. **Given** el agente está en el detalle de un lead, **When** ve el histórico, **Then** ve la lista cronológica de cambios de estado con timestamp y autor.
5. **Given** el agente ve las notas de un lead, **When** las revisa, **Then** están ordenadas cronológicamente (más reciente primero).

---

### User Story 3 - Máquina de estados (Priority: P1)

El agente puede cambiar el estado de un lead siguiendo las transiciones permitidas: NEW → CONTACTED → IN_NEGOTIATION → WON | LOST. Cada cambio de estado se registra en `lead_history` como un registro inmutable con el estado anterior, el nuevo estado, el autor y el timestamp. El sistema rechaza transiciones inválidas (ej. NEW → WON directamente).

**Why this priority**: La máquina de estados es el núcleo del seguimiento comercial. Sin ella no hay control del proceso de venta.

**Independent Test**: Se puede verificando cambiando el estado de un lead paso a paso, verificando que cada transición se registra en el histórico, y que las transiciones inválidas son rechazadas.

**Acceptance Scenarios**:

1. **Given** un lead está en estado NEW, **When** el agente lo cambia a CONTACTED, **Then** el estado se actualiza y se registra en `lead_history`.
2. **Given** un lead está en estado CONTACTED, **When** el agente lo cambia a IN_NEGOTIATION, **Then** el estado se actualiza y se registra en `lead_history`.
3. **Given** un lead está en estado IN_NEGOTIATION, **When** el agente lo cambia a WON, **Then** el estado se actualiza y se registra en `lead_history`.
4. **Given** un lead está en estado IN_NEGOTIATION, **When** el agente lo cambia a LOST, **Then** el estado se actualiza y se registra en `lead_history`.
5. **Given** un lead está en estado NEW, **When** el agente intenta cambiarlo directamente a WON, **Then** el sistema rechaza la transición (no es una transición válida).
6. **Given** cualquier usuario (incluido ADMIN), **When** intenta actualizar o borrar una fila de `lead_history`, **Then** la operación falla (política RLS inmutable).

---

### User Story 4 - Reasignación y exportación CSV (Priority: P2)

El administrador puede reasignar un lead a otro agente. Al reasignar, las marcas de leído del lead se borran en la misma transacción — el lead aparece como "no leído" para el nuevo agente. Tanto agentes como administradores pueden exportar los leads a CSV: los agentes exportan solo sus leads; los administradores exportan todo el tenant.

**Why this priority**: La reasignación es importante para la gestión del equipo pero no es una operación diaria. La exportación CSV es útil para reporting pero no bloquea el flujo principal.

**Independent Test**: Se puede verificar reasignando un lead y confirmando que aparece como no leído para el nuevo agente, y exportando a CSV verificando el contenido.

**Acceptance Scenarios**:

1. **Given** el administrador reasigna un lead a otro agente, **When** la reasignación se completa, **Then** las `lead_read_marks` del lead se borran en la misma transacción.
2. **Given** un lead fue reasignado a un nuevo agente, **When** el nuevo agente accede a la bandeja, **Then** el lead aparece como "no leído".
3. **Given** el agente exporta sus leads a CSV, **When** descarga el archivo, **Then** el CSV contiene solo sus leads asignados.
4. **Given** el administrador exporta leads a CSV, **When** descarga el archivo, **Then** el CSV contiene todos los leads del tenant.

---

### Edge Cases

- ¿Qué ocurre si dos agentes abren el mismo lead simultáneamente? Ambos pueden leer y añadir notas. Las notas son independientes (cada una con su autor y timestamp). El estado se actualiza con last-write-wins.
- ¿Qué ocurre si se elimina un lead? La eliminación es en cascada: `lead_read_marks` → `lead_notes` → `lead_history` → `leads`. Solo ADMIN puede eliminar leads.
- ¿Qué ocurre si un lead no tiene promoción asociada? Es válido (lead generado desde contacto general). El filtro por promoción simplemente no lo incluye si se filtra por promoción específica.
- ¿Qué ocurre si el agente intenta cambiar el estado de un lead que no tiene asignado? El sistema deniega la operación (scope por RLS).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar en la bandeja solo los leads asignados al agente autenticado (scope por RLS).
- **FR-002**: El sistema MUST permitir filtrar la bandeja por estado, source, rango de fechas, promoción asociada y búsqueda textual.
- **FR-003**: El sistema MUST mostrar un indicador visual de "no leído" para leads no leídos por el agente.
- **FR-004**: El sistema MUST registrar automáticamente una marca de leído al abrir el detalle de un lead.
- **FR-005**: El sistema MUST permitir añadir notas internas cronológicas a un lead.
- **FR-006**: El sistema MUST permitir cambiar el estado de un lead siguiendo las transiciones permitidas: NEW → CONTACTED → IN_NEGOTIATION → WON | LOST.
- **FR-007**: El sistema MUST registrar cada cambio de estado en `lead_history` con estado anterior, nuevo estado, autor y timestamp.
- **FR-008**: El sistema MUST hacer `lead_history` físicamente inmutable (solo INSERT y SELECT, nunca UPDATE ni DELETE).
- **FR-009**: El sistema MUST rechazar transiciones de estado inválidas.
- **FR-010**: El sistema MUST permitir al administrador reasignar un lead a otro agente, borrando las marcas de leído en la misma transacción.
- **FR-011**: El sistema MUST permitir exportar leads a CSV con scope por rol (agente: solo sus leads; admin: todo el tenant).
- **FR-012**: El sistema MUST respetar el routing condicional por rol: OPERATOR no accede a la bandeja de leads.
- **FR-013**: El sistema MUST respetar el aislamiento multi-tenant en todas las operaciones de leads.
- **FR-014**: El sistema MUST decrementar el badge de leads no leídos del nav al marcar un lead como leído.

### Key Entities

- **Lead**: Contacto comercial asociado a una promoción (opcional). Atributos: nombre, email, teléfono, mensaje, estado (NEW/CONTACTED/IN_NEGOTIATION/WON/LOST), source (commercial/institutional), channel (FORM/WHATSAPP), promoción asociada, agente asignado.
- **Nota interna**: Comentario cronológico sobre un lead. Atributos: lead, autor, texto, timestamp.
- **Histórico de lead**: Registro inmutable de cambios de estado. Atributos: lead, estado anterior, estado nuevo, autor, timestamp.
- **Marca de leído**: Indicador por-usuario de lectura de un lead. Atributos: lead, usuario, timestamp de lectura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un agente ve solo sus leads asignados en la bandeja — verificable con test de aislamiento entre dos agentes.
- **SC-002**: Las transiciones de estado se registran en `lead_history` — el 100% de los cambios quedan trazados.
- **SC-003**: `lead_history` es inmutable — un UPDATE o DELETE directo falla (verificable con test).
- **SC-004**: Al abrir un lead, la marca de leído se registra y el badge del nav se decrementa.
- **SC-005**: Al reasignar un lead, las marcas de leído se borran y el lead aparece como no leído para el nuevo agente.
- **SC-006**: Los filtros de bandeja devuelven resultados correctos para cada combinación de filtros.
- **SC-007**: La exportación CSV respeta el scope por rol — agentes solo exportan sus leads.
- **SC-008**: Las transiciones inválidas son rechazadas — verificable con test automatizado.

## Assumptions

- Las tablas de BD (`leads`, `lead_notes`, `lead_history`, `lead_read_marks`) ya existen con el schema definido en F002.
- Las políticas RLS ya están configuradas para filtrar por `assigned_agent_id` y hacer `lead_history` inmutable.
- Los enums `LeadStatus`, `LeadSource`, `LeadChannel` ya están definidos en `src/shared/constants/db-enums.ts`.
- El backoffice shell (sidebar, auth guard, badge de leads no leídos) ya está implementado en F010.
- El endpoint `GET /api/internal/leads/unread-count` ya existe (implementado en F010).
- El TenantContext (AuthenticatedContext, TenantAwareRepository) ya está implementado en F004.
- Los datos demo del seed (F009) incluyen leads demo para pruebas.
- La gestión de consentimiento RGPD y derechos ARSOP NO es parte de esta feature (se implementa en F015).
- La gestión de equipo y reasignación masiva de promociones NO es parte de esta feature (F016).
- No hay pipeline visual tipo CRM — es una bandeja con listado y filtros (product.md §7).
