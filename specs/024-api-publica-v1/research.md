# Research: api-publica-v1

## Decisiones de diseño

### 1. Autenticación por API key en middleware

**Decisión**: Middleware de Next.js en `src/features/api-public/middleware/api-key-auth.ts` que resuelve API key desde header `X-API-Key`, verifica contra `api_keys` table (key_hash), y establece ApiKeyContext.

**Rationale**: Centraliza la autenticación para todos los endpoints /api/v1/*. ApiKeyContext aplica filtros a nivel de repositorio (kind='portfolio' + status='PUBLISHED').

**Alternativas consideradas**: Autenticación en cada route handler (duplicación), auth.js v5 (diseñado para sesiones web, no API keys).

### 2. Serialización respetando map_privacy_mode

**Decisión**: Función `serializePromocion` en `src/features/api-public/serializers/promocion-serializer.ts` que omite campo `location` si `map_privacy_mode='AREA'`, dejando solo `location_approx`.

**Rationale**: architecture.md §7.3 exige que coordenadas exactas no se expongan si AREA. La serialización es el punto de control antes de enviar JSON al consumidor.

**Alternativas consideradas**: Filtrar en repositorio (pierde flexibilidad), filtrar en route handler (duplicación).

### 3. Cursor pagination

**Decisión**: Cursor codifica `(sort_key, id)` basado en `updated_at` + `id`. Parámetros query: `cursor` (opcional), `limit` (default 20, max 100).

**Rationale**: architecture.md §7 prohíbe offset pagination. Cursor es estable ante inserciones/borrados.

**Alternativas consideradas**: Offset (prohibido), keyset pagination sin cursor (menos flexible).

### 4. Contract tests con schemas Zod versionados

**Decisión**: Schemas Zod en `tests/contract/v1/` que definen el contrato exacto de request/response. Tests verifican que las responses de la API cumplen el schema. Test de no-divergencia compara schema actual contra snapshot.

**Rationale**: constitution.md §10 exige tests de contrato para APIs públicas. Schemas versionados permiten evolución sin romper consumidores.

**Alternativas consideradas**: OpenAPI autogenerado (F027), contract tests manuales (frágiles).

### 5. Consentimiento RGPD en POST leads

**Decisión**: Schema Zod requiere campo `consentimiento` con `legal_basis` (string) y `text_accepted` (string). Si falta → 422 con detalle del campo. Se registra en `consent_records` en transacción atómica con el lead.

**Rationale**: architecture.md §7.4 y product.md §6.7 exigen consentimiento explícito. Sin él, el lead no se persiste.

### 6. Rate limiting por API key

**Decisión**: Usar rate limiter de F008 (Upstash Redis) con límite por API key (configurable en `api_keys.rate_limit_per_min`). Degradación graceful: si Redis falla, se alerta pero no se bloquea.

**Rationale**: architecture.md §1 permite degradación graceful en servicios auxiliares. Rate limiting por key previene abuso de un solo consumidor.
