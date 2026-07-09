# Feature Specification: api-publica-v1

**Feature Branch**: `feature/024-api-publica-v1`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "GET /api/v1/promociones (filtro obligatorio kind=portfolio, cursor pagination) + POST /api/v1/leads/institutional (consentimiento RGPD, email queue), auth por API key, rate limiting, serialización que respeta modo de privacidad"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - GET /api/v1/promociones con autenticación API key (Priority: P1)

Un consumidor externo autenticado con API key en header `X-API-Key` hace GET a `/api/v1/promociones`. El sistema resuelve ApiKeyContext en middleware, aplica filtro obligatorio `kind='portfolio'` + `status='PUBLISHED'` a nivel de repositorio, serializa respetando `map_privacy_mode` (si AREA, omite location y solo devuelve location_approx), y retorna lista paginada por cursor con rate limiting por API key.

**Why this priority**: Es el endpoint principal de lectura del catálogo institucional. Sin él, los consumidores externos no pueden acceder a las promociones.

**Independent Test**: Hacer GET con API key válida → 200 con lista de promociones portfolio+PUBLISHED. Sin API key → 401. Con key inválida → 403. Verificar que responses con map_privacy_mode='AREA' no contienen campo location.

**Acceptance Scenarios**:

1. **Given** un consumidor con API key válida, **When** hace GET /api/v1/promociones, **Then** retorna 200 con lista de promociones kind='portfolio' y status='PUBLISHED'.
2. **Given** un consumidor sin API key, **When** hace GET, **Then** retorna 401 Unauthorized.
3. **Given** un consumidor con API key inválida/revocada, **When** hace GET, **Then** retorna 403 Forbidden.
4. **Given** una promoción con map_privacy_mode='AREA', **When** se serializa, **Then** el JSON no contiene campo location, solo location_approx.
5. **Given** una promoción con map_privacy_mode='EXACT', **When** se serializa, **Then** el JSON contiene location con coordenadas.
6. **Given** un consumidor superando rate limit, **When** hace múltiples requests, **Then** retorna 429 Too Many Requests.
7. **Given** la respuesta paginada, **When** se inspecciona, **Then** usa cursor pagination (no offset).

### User Story 2 - POST /api/v1/leads/institutional con consentimiento RGPD (Priority: P1)

Un consumidor externo autenticado hace POST a `/api/v1/leads/institutional` con payload (nombre, email, teléfono, mensaje, promocion_id, tipologia_id opcional, consentimiento RGPD con legal_basis + text_accepted). El sistema valida con Zod, verifica consentimiento obligatorio, crea lead con source='institutional' en transacción atómica, encola email de notificación en email_queue (no directo a Resend), y retorna 201. Si falta consentimiento → 422.

**Why this priority**: Es el endpoint de cesión de leads desde consumidores externos. Sin consentimiento RGPD, no se puede persistir el lead.

**Independent Test**: Hacer POST con consentimiento válido → 201, lead creado, email encolado. Sin consentimiento → 422 con detalle del campo faltante.

**Acceptance Scenarios**:

1. **Given** un consumidor con API key válida, **When** hace POST con consentimiento válido, **Then** retorna 201 Created, lead creado con source='institutional'.
2. **Given** un payload sin consentimiento, **When** se hace POST, **Then** retorna 422 Unprocessable Entity con detalle del campo faltante.
3. **Given** un lead creado, **When** se procesa la transacción, **Then** email de notificación encolado en email_queue (no enviado directamente).
4. **Given** un consumidor superando rate limit, **When** hace POST, **Then** retorna 429.
5. **Given** el lead creado, **When** se inspecciona, **Then** tiene source='institutional', channel='FORM', assigned_agent_id desde promoción.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe exponer GET /api/v1/promociones con autenticación por API key en header X-API-Key.
- **FR-002**: El sistema debe resolver ApiKeyContext en middleware para requests a /api/v1/*.
- **FR-003**: El sistema debe aplicar filtro obligatorio kind='portfolio' + status='PUBLISHED' a nivel de repositorio (no de endpoint).
- **FR-004**: El sistema debe serializar promociones respetando map_privacy_mode: si AREA, omitir location y solo devolver location_approx.
- **FR-005**: El sistema debe implementar cursor pagination en GET /api/v1/promociones (no offset).
- **FR-006**: El sistema debe aplicar rate limiting por API key en /api/v1/*.
- **FR-007**: El sistema debe exponer POST /api/v1/leads/institutional con autenticación por API key.
- **FR-008**: El sistema debe validar payload de POST con Zod (nombre, email, teléfono, mensaje, promocion_id, tipologia_id opcional, consentimiento).
- **FR-009**: El sistema debe requerir consentimiento RGPD explícito (legal_basis + text_accepted) en POST leads.
- **FR-010**: El sistema debe retornar 422 si falta consentimiento en POST leads.
- **FR-011**: El sistema debe crear lead con source='institutional' en transacción atómica.
- **FR-012**: El sistema debe encolar email de notificación en email_queue (no envío directo a Resend).
- **FR-013**: El sistema debe retornar 401 si falta API key, 403 si es inválida/revocada.
- **FR-014**: El sistema debe retornar 429 si se supera rate limit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: GET /api/v1/promociones retorna solo promociones kind='portfolio' y status='PUBLISHED'.
- **SC-002**: Promociones con map_privacy_mode='AREA' no contienen campo location en JSON response.
- **SC-003**: Cursor pagination funcional sin offset.
- **SC-004**: Rate limiting por API key funcional (429 tras superar límite).
- **SC-005**: POST /api/v1/leads/institutional crea lead con consentimiento válido.
- **SC-006**: POST sin consentimiento retorna 422 con detalle del campo faltante.
- **SC-007**: Emails encolados en email_queue (no enviados directamente).
- **SC-008**: Contract tests pasan y bloquean cambios incompatibles en CI.
- **SC-009**: Autenticación por API key funcional (401 sin key, 403 key inválida).

## Assumptions

- ApiKeyContext (F004) está implementado y resuelve API key desde header X-API-Key.
- email_queue (F007) está operativa con worker de procesamiento.
- Rate limiting (F008) está configurado con Upstash Redis/Vercel KV.
- PromocionRepository (F011) tiene métodos para cursor pagination.
- consent_records (F015) está implementado con validación RGPD.
- API keys (F016) están creadas y almacenadas con key_hash.

## Out of Scope

- OpenAPI/Swagger expuesto públicamente (solo interno, /api/internal/docs — F027).
- Reintentos automáticos de POST (el consumidor es responsable de informar al usuario si falla).
- Endpoints adicionales fuera de promociones y leads/institutional.
- Vista de autenticación web (solo API key en header).
- Versión v2 de la API.
