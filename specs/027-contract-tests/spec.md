# Feature Specification: Contract Tests

**Feature Branch**: `feature/027-contract-tests`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "Tests de contrato para /api/v1/*, schemas zod versionados, espejo del consumidor, OpenAPI autogenerado (interno), test de no-divergencia bloqueante en CI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Snapshot de schemas y test de no-divergencia (Priority: P1)

Un desarrollador modifica un schema zod de la API pública v1 (añade un campo, cambia un tipo, elimina un campo obligatorio). El sistema compara automáticamente el schema actual contra un snapshot versionado almacenado en `tests/contract/v1/snapshots/`. Si hay diferencias (cualquier cambio, sea compatible o no), el test falla y bloquea el merge en CI. El desarrollador puede actualizar explícitamente el snapshot ejecutando `pnpm test:contract -- --update` si el cambio es intencional.

**Why this priority**: Sin este mecanismo, un cambio accidental en los schemas de respuesta puede romper silenciosamente a consumidores externos en producción. Es la red de seguridad principal del contrato API y está explícitamente requerido en architecture.md §7.12 ("test de no-divergencia bloquea merge").

**Independent Test**: Ejecutar `pnpm test:contract` con los snapshots actuales debe pasar. Modificar manualmente un schema zod (ej: cambiar un campo required a optional) y volver a ejecutar debe fallar con mensaje claro indicando la divergencia.

**Acceptance Scenarios**:

1. **Given** un snapshot versionado existe en `tests/contract/v1/snapshots/promocion-response.schema.json`, **When** un desarrollador cambia un campo required a optional en el schema zod, **Then** el test de no-divergencia falla con mensaje indicando el campo y el cambio.
2. **Given** el test de no-divergencia falla, **When** el desarrollador ejecuta `pnpm test:contract -- --update`, **Then** el snapshot se actualiza y el test pasa en la siguiente ejecución.
3. **Given** un snapshot existe, **When** un desarrollador añade un campo opcional nuevo, **Then** el test de no-divergencia falla (cualquier cambio requiere actualización explícita del snapshot).
4. **Given** no existe snapshot para un schema, **When** se ejecuta `pnpm test:contract`, **Then** el snapshot se genera automáticamente y el test pasa.

---

### User Story 2 - OpenAPI autogenerado desde schemas zod (Priority: P2)

Un desarrollador o consumidor interno necesita documentación actualizada de los endpoints públicos v1. El sistema genera automáticamente un spec OpenAPI 3.0 desde los schemas zod de request y response. El endpoint `/api/internal/docs` sirve el spec OpenAPI en formato JSON. Solo accesible con sesión de backoffice válida (admin u operador).

**Why this priority**: La documentación automática elimina la deriva entre código y docs. Al ser interno, no expone la API a consumidores no autorizados. Es útil para debugging y para que el equipo de frontend conozca el contrato exacto.

**Independent Test**: Autenticarse como admin y hacer GET /api/internal/docs. Verificar que devuelve un spec OpenAPI 3.0 válido en JSON con los paths `/api/v1/promociones` (GET) y `/api/v1/leads/institutional` (POST).

**Acceptance Scenarios**:

1. **Given** un admin está autenticado, **When** hace GET /api/internal/docs, **Then** recibe un spec OpenAPI 3.0 en JSON con los paths `/api/v1/promociones` y `/api/v1/leads/institutional`.
2. **Given** el spec OpenAPI se genera, **When** se inspecciona, **Then** los schemas de request/response coinciden con los schemas zod versionados.
3. **Given** un usuario no autenticado, **When** hace GET /api/internal/docs, **Then** recibe 401 Unauthorized.
4. **Given** los schemas zod cambian, **When** se regenera el spec OpenAPI, **Then** el spec refleja los cambios automáticamente.

---

### User Story 3 - Contract tests de rate limiting (Priority: P3)

Un consumidor API intenta hacer más requests de las permitidas por su API key. El contract test verifica que el endpoint responde 429 Too Many Requests cuando se supera el límite configurado. El test funciona tanto con Redis real como en modo degraded (sin rate limiting).

**Why this priority**: El rate limiting es crítico para proteger la API de abuso, pero su contract test es menos crítico que la no-divergencia de schemas porque el comportamiento ya está cubierto por tests de integración.

**Independent Test**: Ejecutar `pnpm test:contract` y verificar que el test de rate limiting pasa.

**Acceptance Scenarios**:

1. **Given** un contract test de rate limiting, **When** se ejecuta, **Then** verifica que el endpoint puede responder 429 cuando el rate limit se supera.
2. **Given** el rate limit store no está configurado, **When** el contract test se ejecuta, **Then** el test pasa (modo degraded, sin rate limiting).

---

### Edge Cases

- ¿Qué ocurre si el snapshot file se corrompe o está vacío? El test debe fallar con mensaje claro indicando que el snapshot es inválido.
- ¿Qué ocurre si un schema zod usa `.optional()` en un campo que antes era required? El test de no-divergencia debe detectarlo como cambio y fallar.
- ¿Qué ocurre si se añade un nuevo endpoint a la API v1? El spec OpenAPI debe incluirlo automáticamente sin intervención manual.
- ¿Qué ocurre si el spec OpenAPI se genera con schemas inválidos? La generación debe fallar con error claro, no generar un spec inválido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST generar snapshots JSON de los schemas zod de la API v1 en `tests/contract/v1/snapshots/`.
- **FR-002**: El test de no-divergencia MUST comparar el schema actual contra el snapshot y fallar si hay cualquier diferencia.
- **FR-003**: El comando `pnpm test:contract -- --update` MUST actualizar los snapshots a la versión actual.
- **FR-004**: El endpoint `/api/internal/docs` MUST devolver un spec OpenAPI 3.0 válido en formato JSON.
- **FR-005**: El endpoint `/api/internal/docs` MUST requerir autenticación de backoffice (sesión válida de admin u operador).
- **FR-006**: El spec OpenAPI MUST incluir los paths `/api/v1/promociones` (GET) y `/api/v1/leads/institutional` (POST).
- **FR-007**: El spec OpenAPI MUST generar los schemas de request/response desde los schemas zod versionados automáticamente.
- **FR-008**: Los contract tests de rate limiting MUST verificar que el endpoint responde 429 cuando el límite se supera.
- **FR-009**: Los contract tests MUST ejecutarse con `pnpm test:contract` (script existente en package.json).
- **FR-010**: Los contract tests MUST ser bloqueantes en CI (si fallan, el merge se bloquea).

### Key Entities

- **Schema Snapshot**: Archivo JSON que contiene la serialización del schema zod en un momento dado. Vive en `tests/contract/v1/snapshots/`. Se versiona en git.
- **OpenAPI Spec**: Documento JSON que describe los endpoints de la API v1 según el estándar OpenAPI 3.0. Se genera dinámicamente desde los schemas zod.
- **Contract Test**: Test de Vitest que verifica que los schemas y endpoints de la API cumplen el contrato versionado. Vive en `tests/contract/v1/`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El test de no-divergencia detecta cualquier cambio en los schemas zod (breaking o no) en el 100% de los casos.
- **SC-002**: El spec OpenAPI generado es válido según el estándar OpenAPI 3.0 (verificable con validadores externos).
- **SC-003**: El endpoint `/api/internal/docs` responde en menos de 200ms en condiciones normales.
- **SC-004**: Los contract tests se ejecutan en menos de 10 segundos en total.
- **SC-005**: Cero falsos positivos: si el schema no cambia, el test de no-divergencia pasa consistentemente.

## Assumptions

- Los schemas zod de la API v1 ya existen en `src/features/api-public/schemas/` (aportados por F024).
- Los serializers ya existen en `src/features/api-public/serializers/` (aportados por F024).
- El script `pnpm test:contract` ya está configurado en package.json como `vitest --run tests/contract`.
- La generación de OpenAPI desde zod se puede hacer con una librería como `zod-to-openapi` o similar.
- Los snapshots se versionan en git (no se ignoran en .gitignore).
- El endpoint `/api/internal/docs` usa el mismo sistema de autenticación que el backoffice (Auth.js v5 con `getServerSession()`).
- No se requieren cambios en los endpoints existentes de `/api/v1/*` — solo se añaden tests y documentación.
