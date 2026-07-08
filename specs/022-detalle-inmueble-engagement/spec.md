# Feature Specification: detalle-inmueble-engagement

**Feature Branch**: `feature/022-detalle-inmueble-engagement`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Formulario de contacto (zod client+server), botón WhatsApp con mensaje predefinido, botón compartir (OG), inmuebles relacionados (regla: misma zona+tipo+precio ±20%)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Formulario de contacto con consentimiento RGPD (Priority: P1)

Un visitante público en la ficha de detalle (`/inmuebles/[slug]`) completa el formulario de contacto (nombre, email, teléfono, tipología de interés opcional, mensaje) y marca el checkbox de consentimiento RGPD. Al enviar, el sistema valida con Zod en cliente y servidor, crea un lead con `source='commercial'` y `channel='FORM'`, registra el consentimiento en `consent_records`, encola email de confirmación al lead y notificación al agente asignado. Si falta consentimiento, error visible en formulario y no se persiste nada. Protegido con rate limiting por IP.

**Why this priority**: El formulario es el canal principal de conversión. Sin él, la ficha es escaparate sin CTA.

**Independent Test**: Completar formulario con consentimiento → lead creado con source='commercial', channel='FORM', consentimiento en consent_records, emails encolados. Sin consentimiento → error visible, nada persistido.

**Acceptance Scenarios**:

1. **Given** un visitante en ficha de detalle, **When** completa formulario con consentimiento, **Then** lead creado con source='commercial', channel='FORM', consentimiento registrado.
2. **Given** un visitante sin marcar consentimiento, **When** intenta enviar, **Then** error visible "Debe aceptar la política de privacidad", nada persistido.
3. **Given** un lead creado, **When** se procesa la transacción, **Then** email de confirmación encolado en email_queue, notificación al agente encolada.
4. **Given** un visitante enviando múltiples veces, **When** supera rate limit, **Then** error 429 "Demasiados intentos".
5. **Given** formulario enviado, **When** se inspecciona, **Then** mensaje de confirmación "Solicitud recibida. Nuestro equipo te contactará en 24-48h."
6. **Given** el formulario, **When** se inspecciona Lighthouse, **Then** Accessibility ≥90.

### User Story 2 - Botón WhatsApp con mensaje predefinido (Priority: P2)

Un visitante hace clic en el botón WhatsApp. El sistema abre `https://wa.me/{number}?text={prefilled_message}` con el número y mensaje de `contact_config`. Si el usuario ya dio consentimiento en el formulario, el clic genera un lead con `channel='WHATSAPP'`. Sin consentimiento, solo abre el enlace.

**Acceptance Scenarios**:

1. **Given** un visitante en ficha, **When** hace clic en WhatsApp, **Then** abre wa.me con número y mensaje predefinido de contact_config.
2. **Given** un visitante que ya dio consentimiento, **When** hace clic en WhatsApp, **Then** además se genera lead con channel='WHATSAPP'.
3. **Given** un visitante sin consentimiento, **When** hace clic en WhatsApp, **Then** solo abre el enlace, no genera lead.

### User Story 3 - Botón compartir con OG (Priority: P3)

Un visitante hace clic en compartir. El sistema copia la URL al portapapeles y proporciona metadatos Open Graph para WhatsApp, Twitter y email. No genera lead.

**Acceptance Scenarios**:

1. **Given** un visitante en ficha, **When** hace clic en compartir, **Then** URL copiada al portapapeles con feedback visual.
2. **Given** la ficha, **When** se inspeccionan OG tags, **Then** og:title, og:description, og:image presentes y correctos.

### User Story 4 - Inmuebles relacionados (Priority: P2)

Al pie de la ficha, hasta 4 PropertyCards de promociones PUBLISHED con misma zona (consulta espacial PostGIS), mismo tipo y precio ±20%. Reglas deterministas.

**Acceptance Scenarios**:

1. **Given** una ficha cargada, **When** se renderiza la sección relacionados, **Then** hasta 4 PropertyCards de misma zona, tipo y precio ±20%.
2. **Given** una promoción sin relacionados, **When** se renderiza, **Then** sección no aparece o muestra mensaje "No hay inmuebles similares en esta zona".
3. **Given** los relacionados, **When** se inspecciona, **Then** solo promociones PUBLISHED, consulta usa índice GIST espacial.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe renderizar formulario de contacto en la ficha de detalle.
- **FR-002**: El sistema debe validar formulario con Zod en cliente y servidor (mismo schema).
- **FR-003**: El sistema debe requerir consentimiento RGPD explícito (checkbox + texto legal).
- **FR-004**: El sistema debe crear lead con source='commercial', channel='FORM' al enviar formulario válido.
- **FR-005**: El sistema debe registrar consentimiento en consent_records en la misma transacción.
- **FR-006**: El sistema debe encolar email de confirmación al lead en email_queue (no directo a Resend).
- **FR-007**: El sistema debe encolar notificación al agente asignado en email_queue.
- **FR-008**: El sistema debe proteger formulario con rate limiting por IP.
- **FR-009**: El sistema debe mostrar error visible si falta consentimiento.
- **FR-010**: El sistema debe mostrar mensaje de confirmación tras envío exitoso.
- **FR-011**: El sistema debe renderizar botón WhatsApp con número y mensaje de contact_config.
- **FR-012**: El sistema debe generar lead con channel='WHATSAPP' si ya hay consentimiento en sesión.
- **FR-013**: El sistema debe renderizar botón compartir que copia URL al portapapeles.
- **FR-014**: El sistema debe proporcionar OG tags funcionales (og:title, og:description, og:image).
- **FR-015**: El sistema debe renderizar hasta 4 inmuebles relacionados al pie de la ficha.
- **FR-016**: El sistema debe filtrar relacionados por misma zona (PostGIS), tipo y precio ±20%.
- **FR-017**: El sistema debe mostrar solo promociones PUBLISHED en relacionados.
- **FR-018**: El sistema debe garantizar accesibilidad WCAG AA (labels, aria-live, focus-visible).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Formulario crea lead con consentimiento RGPD válido.
- **SC-002**: Sin consentimiento, formulario muestra error y no persiste nada.
- **SC-003**: Emails encolados en email_queue (no enviados directamente).
- **SC-004**: Rate limiting funcional (429 tras superar límite).
- **SC-005**: WhatsApp abre con mensaje predefinido correcto.
- **SC-006**: Botón compartir copia URL con feedback visual.
- **SC-007**: OG tags presentes y funcionales.
- **SC-008**: Relacionados muestra hasta 4 tarjetas de misma zona/tipo/precio ±20%.
- **SC-009**: Lighthouse Accessibility ≥90 en ficha con nuevos componentes.

## Assumptions

- LeadRepository tiene método para crear lead con consentimiento.
- contact_config (F017) tiene whatsapp_number y whatsapp_prefilled_message.
- email_queue (F007) está operativa con worker de procesamiento.
- Rate limiting (F008) está configurado con Upstash Redis/Vercel KV.
- PostGIS está activo con índice GIST en promociones.location.
- PropertyCard de F020 se reutiliza para relacionados.

## Out of Scope

- Chat en vivo o asistente conversacional.
- Compartición vía WhatsApp API de negocio (solo enlace wa.me).
- Recomendaciones ML para relacionados.
- Vista lista de relacionados.
- Lead al hacer clic en WhatsApp sin consentimiento previo.
