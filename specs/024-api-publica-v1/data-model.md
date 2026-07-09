# Data Model: api-publica-v1

## Entidades consumidas/creadas

### API Key (api_keys) — LECTURA (autenticación)
- **Campos usados**: id, tenant_id, key_hash, is_active, rate_limit_per_min, last_used_at
- **Autenticación**: verificar key_hash contra API key en header

### Promoción (promociones) — LECTURA (GET)
- **Campos usados**: id, slug, nombre, tipo, operacion, kind, status, precio, superficie, dormitorios, baños, municipio, isla, map_privacy_mode, location, location_approx, updated_at
- **Filtro obligatorio**: kind='portfolio' + status='PUBLISHED' (ApiKeyContext)
- **Serialización**: si map_privacy_mode='AREA', omitir location

### Lead (leads) — CREACIÓN (POST)
- **Campos usados**: id, tenant_id, promocion_id, tipologia_id (nullable), nombre, email, telefono, mensaje, source='institutional', channel='FORM', assigned_agent_id, status='NEW', created_at
- **Relaciones**: pertenece a promoción, tipología (opcional), agente asignado

### Consent Record (consent_records) — CREACIÓN (POST)
- **Campos usados**: id, tenant_id, lead_id, legal_basis, text_accepted, ip, user_agent, created_at
- **Inmutable**: sin UPDATE/DELETE
- **Relaciones**: pertenece a lead

### Email Queue (email_queue) — CREACIÓN (POST)
- **Campos usados**: id, tenant_id, template, payload (JSONB), to_email, status='PENDING', retries=0, created_at
- **Relaciones**: pertenece a tenant

## Reglas de negocio

1. **ApiKeyContext**: filtro obligatorio kind='portfolio' + status='PUBLISHED' a nivel de repositorio.
2. **Serialización**: si map_privacy_mode='AREA', omitir location en JSON.
3. **Cursor pagination**: no offset, cursor codifica (updated_at, id).
4. **Consentimiento obligatorio**: sin consentimiento → 422, lead no se persiste.
5. **Transacción atómica**: lead + consentimiento + email en una transacción.
6. **Emails por cola**: nunca envío directo a Resend.
7. **Rate limiting**: por API key, degradación graceful si Redis falla.

## Validaciones

- Zod schemas para request/response.
- Email válido (zod email).
- Teléfono opcional pero si presente, formato válido.
- Consentimiento: legal_basis (string) + text_accepted (string) requeridos.
- promocion_id debe existir y ser PUBLISHED.
