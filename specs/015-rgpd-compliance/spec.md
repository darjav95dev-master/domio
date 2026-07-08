# Feature Specification: RGPD Compliance

**Feature Branch**: `feature/015-rgpd-compliance`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Registro de consentimiento RGPD, ejercicio de derechos ARSOP (export CSV + borrado en cascada), trazabilidad en arsop_requests, inmutabilidad de consent_records y arsop_requests."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro de consentimiento RGPD (Priority: P1)

Cuando se crea un lead (desde formulario público o API institucional), el sistema requiere un consentimiento RGPD válido. El consentimiento se registra en `consent_records` con `legal_basis`, `text_accepted`, `ip`, `user_agent` y `created_at`. Si falta el consentimiento o es inválido, el lead no se persiste y el sistema responde con 422 Unprocessable Entity.

**Why this priority**: Sin consentimiento válido, el tratamiento de datos personales es ilegal. Es el requisito regulatorio más crítico.

**Independent Test**: Intentar crear un lead sin consentimiento → 422. Crear con consentimiento → 201 + registro en consent_records.

**Acceptance Scenarios**:

1. **Given** un formulario de contacto público, **When** se envía sin marcar el checkbox de consentimiento, **Then** el sistema responde 422 con error "El consentimiento RGPD es obligatorio".
2. **Given** un formulario de contacto público, **When** se envía con consentimiento válido, **Then** el lead se persiste y se crea un registro en `consent_records` con legal_basis, text_accepted, ip, user_agent.
3. **Given** la API pública POST /api/v1/leads/institutional, **When** se envía sin consentimiento, **Then** responde 422 con detalle del campo faltante.
4. **Given** un consentimiento registrado, **When** cualquier usuario intenta actualizarlo o borrarlo, **Then** la operación falla (política RLS inmutable).

---

### User Story 2 - Exportación ARSOP (Priority: P1)

El administrador puede exportar todos los datos de un lead a CSV desde el backoffice. El sistema genera un CSV con datos personales, notas, histórico y consentimientos, lo almacena en R2, y registra la operación en `arsop_requests` con `request_type='EXPORT'` y `result_asset_id`.

**Why this priority**: El derecho de acceso/portabilidad es un requisito legal. El admin debe poder ejercerlo desde el backoffice.

**Independent Test**: Admin exporta un lead → CSV generado en R2 → arsop_requests registra la operación con result_asset_id.

**Acceptance Scenarios**:

1. **Given** el ADMIN está en el detalle de un lead, **When** pulsa "Exportar datos", **Then** el sistema genera CSV con todos los datos del lead, lo almacena en R2, y registra en `arsop_requests`.
2. **Given** la exportación se completó, **When** el admin consulta `arsop_requests`, **Then** ve el registro con request_type='EXPORT', timestamp, autor, y result_asset_id.
3. **Given** un usuario no-ADMIN intenta exportar, **When** lo intenta, **Then** el sistema deniega el acceso.

---

### User Story 3 - Borrado ARSOP (Priority: P1)

El administrador puede borrar un lead y todos sus datos asociados desde el backoffice. El borrado es en cascada en una transacción única: `lead_read_marks` → `lead_notes` → `lead_history` → `consent_records` → `leads`. La operación se registra en `arsop_requests` con `request_type='DELETE'`.

**Why this priority**: El derecho de supresión es un requisito legal fundamental.

**Independent Test**: Admin borra un lead → todos los registros asociados eliminados → arsop_requests registra la operación.

**Acceptance Scenarios**:

1. **Given** el ADMIN está en el detalle de un lead, **When** pulsa "Borrar datos" y confirma, **Then** el sistema elimina en cascada todos los registros asociados al lead y registra en `arsop_requests`.
2. **Given** el borrado se completó, **When** se consulta `arsop_requests`, **Then** ve el registro con request_type='DELETE', timestamp y autor.
3. **Given** un lead borrado, **When** se intenta acceder a sus datos, **Then** no existen (borrado completo).
4. **Given** un usuario no-ADMIN intenta borrar, **When** lo intenta, **Then** el sistema deniega el acceso.

---

### User Story 4 - Trazabilidad e inmutabilidad (Priority: P2)

Toda operación ARSOP queda registrada en `arsop_requests` con timestamp, usuario que la ejecutó, tipo de solicitud y referencia al asset cuando aplica. Tanto `consent_records` como `arsop_requests` son físicamente inmutables — las políticas RLS impiden UPDATE y DELETE.

**Why this priority**: La trazabilidad es necesaria para demostrar cumplimiento regulatorio. La inmutabilidad garantiza que los registros no pueden ser alterados.

**Independent Test**: Verificar que UPDATE/DELETE sobre consent_records y arsop_requests falla.

**Acceptance Scenarios**:

1. **Given** una operación ARSOP ejecutada, **When** se consulta `arsop_requests`, **Then** se ve el registro completo con todos los metadatos.
2. **Given** cualquier usuario (incluido ADMIN), **When** intenta UPDATE sobre `consent_records`, **Then** la operación falla.
3. **Given** cualquier usuario (incluido ADMIN), **When** intenta DELETE sobre `arsop_requests`, **Then** la operación falla.

---

### Edge Cases

- ¿Qué ocurre si el lead ya fue borrado y se intenta exportar? Error: lead no encontrado.
- ¿Qué ocurre si R2 falla al almacenar el CSV? La transacción de exportación falla, no se registra en arsop_requests, y el admin puede reintentar.
- ¿Qué ocurre si dos admins ejecutan ARSOP sobre el mismo lead simultáneamente? El primero que complete la transacción gana. El segundo encuentra el lead borrado (si fue DELETE) o genera un CSV con datos potencialmente modificados (si fue EXPORT).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST requerir consentimiento RGPD válido para crear un lead. Sin consentimiento → 422.
- **FR-002**: El sistema MUST registrar el consentimiento en `consent_records` con legal_basis, text_accepted, ip, user_agent, created_at.
- **FR-003**: El sistema MUST hacer `consent_records` inmutable (solo INSERT y SELECT, nunca UPDATE ni DELETE).
- **FR-004**: El sistema MUST permitir al ADMIN exportar todos los datos de un lead a CSV.
- **FR-005**: El sistema MUST almacenar el CSV de exportación en R2 vía MediaService.
- **FR-006**: El sistema MUST registrar la exportación en `arsop_requests` con request_type='EXPORT' y result_asset_id.
- **FR-007**: El sistema MUST permitir al ADMIN borrar un lead y todos sus datos asociados en cascada.
- **FR-008**: El sistema MUST registrar el borrado en `arsop_requests` con request_type='DELETE'.
- **FR-009**: El sistema MUST hacer `arsop_requests` inmutable (solo INSERT y SELECT).
- **FR-010**: El sistema MUST denegar operaciones ARSOP a usuarios no-ADMIN.
- **FR-011**: El sistema MUST ejecutar el borrado en cascada en una transacción única.

### Key Entities

- **Consent Record**: Registro inmutable de consentimiento RGPD. Atributos: lead, legal_basis, text_accepted, ip, user_agent, created_at.
- **ARSOP Request**: Registro de ejercicio de derechos. Atributos: lead, request_type (EXPORT/DELETE), executed_by, executed_at, result_asset_id (nullable).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los leads creados tienen un consent_record asociado — verificable con test.
- **SC-002**: Lead sin consentimiento → 422 en el 100% de los casos.
- **SC-003**: consent_records y arsop_requests son inmutables — UPDATE/DELETE falla.
- **SC-004**: Exportación CSV genera archivo en R2 con todos los datos del lead.
- **SC-005**: Borrado en cascada elimina todos los registros asociados en una transacción.
- **SC-006**: Toda operación ARSOP queda registrada en arsop_requests.

## Assumptions

- Las tablas `consent_records` y `arsop_requests` ya existen (F002).
- Las políticas RLS de inmutabilidad ya están configuradas.
- MediaService ya puede subir archivos a R2 (F006).
- LeadRepository ya existe (F014).
- El backoffice shell con routing por rol ya funciona (F010, F014).
- La notificación automática al interesado NO es parte de esta feature.
- El portal público de autogestión NO es parte de esta feature.
- Solo se soporta formato CSV (no JSON estructurado para portabilidad).
