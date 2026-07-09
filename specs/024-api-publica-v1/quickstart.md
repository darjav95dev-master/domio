# Quickstart Validation: api-publica-v1

## Prerrequisitos

- Base de datos con seed data: `pnpm db:seed`
- API key creada en backoffice (F016) o directamente en BD
- Servidor de desarrollo: `pnpm dev`

## Escenarios de validación

### 1. GET /api/v1/promociones con API key válida

```bash
curl -H "X-API-Key: tu-api-key" http://localhost:3000/api/v1/promociones
```

**Esperado**: 200 OK con lista de promociones kind='portfolio' y status='PUBLISHED'. Respuesta paginada con cursor.

### 2. GET sin API key

```bash
curl http://localhost:3000/api/v1/promociones
```

**Esperado**: 401 Unauthorized.

### 3. GET con API key inválida

```bash
curl -H "X-API-Key: invalid-key" http://localhost:3000/api/v1/promociones
```

**Esperado**: 403 Forbidden.

### 4. Verificar serialización con map_privacy_mode='AREA'

1. Identificar una promoción con map_privacy_mode='AREA' en la respuesta.
2. **Esperado**: el JSON no contiene campo `location`, solo `location_approx`.

### 5. POST /api/v1/leads/institutional con consentimiento

```bash
curl -X POST http://localhost:3000/api/v1/leads/institutional \
  -H "X-API-Key: tu-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "+34600000000",
    "mensaje": "Interesado en la promoción",
    "promocion_id": "uuid-promocion",
    "consentimiento": {
      "legal_basis": "explicit_consent",
      "text_accepted": "Acepto la política de privacidad"
    }
  }'
```

**Esperado**: 201 Created. Lead creado con source='institutional'. Email encolado en email_queue.

### 6. POST sin consentimiento

```bash
curl -X POST http://localhost:3000/api/v1/leads/institutional \
  -H "X-API-Key: tu-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "mensaje": "Interesado"
  }'
```

**Esperado**: 422 Unprocessable Entity con detalle del campo faltante.

### 7. Rate limiting

1. Hacer 10 requests seguidos en menos de 1 minuto (si rate_limit_per_min=5).
2. **Esperado**: 429 Too Many Requests tras superar el límite.

### 8. Contract tests

```bash
pnpm vitest run tests/contract/v1/
```

**Esperado**: todos los tests pasan. Verifican que responses cumplen schemas Zod versionados.
