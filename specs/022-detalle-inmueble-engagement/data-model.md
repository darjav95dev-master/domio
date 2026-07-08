# Data Model: detalle-inmueble-engagement

## Entidades consumidas/creadas

### Lead (leads) — CREACIÓN
- **Campos usados**: id, tenant_id, promocion_id, tipologia_id (nullable), nombre, email, telefono, mensaje, source='commercial', channel='FORM'|'WHATSAPP', assigned_agent_id, status='NEW', created_at
- **Relaciones**: pertenece a promoción, tipología (opcional), agente asignado

### Consent Record (consent_records) — CREACIÓN
- **Campos usados**: id, tenant_id, lead_id, legal_basis, text_accepted, ip, user_agent, created_at
- **Inmutable**: sin UPDATE/DELETE (policy RLS)
- **Relaciones**: pertenece a lead

### Email Queue (email_queue) — CREACIÓN
- **Campos usados**: id, tenant_id, template, payload (JSONB), to_email, status='PENDING', retries=0, created_at
- **Relaciones**: pertenece a tenant

### Contact Config (contact_config) — LECTURA
- **Campos usados**: whatsapp_number, whatsapp_prefilled_message, telefono, email
- **Fila única por tenant**

### Promoción (promociones) — LECTURA (relacionados)
- **Campos usados**: id, slug, nombre, tipo, operacion, precio, superficie, municipio, location (PostGIS), status, kind
- **Filtro**: PUBLISHED, misma zona (ST_DWithin), mismo tipo, precio ±20%

## Reglas de negocio

1. **Sin consentimiento → sin lead**: 422 si falta consentimiento.
2. **Transacción atómica**: lead + consentimiento + emails en una transacción.
3. **Emails por cola**: nunca envío directo a Resend.
4. **Rate limiting**: 5 envíos/IP/hora en formulario.
5. **WhatsApp sin consentimiento**: solo abre enlace, no genera lead.
6. **Relacionados**: solo PUBLISHED, PostGIS + tipo + precio ±20%, máximo 4.

## Validaciones

- Zod schema compartido client+server para formulario.
- Email válido (zod email).
- Teléfono opcional pero si presente, formato válido.
- Consentimiento: boolean true requerido.
