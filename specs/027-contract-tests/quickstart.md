# Quickstart: Contract Tests Validation

**Feature**: 027-contract-tests | **Date**: 2026-07-09

## Prerequisites

1. Dependencias instaladas: `pnpm install`
2. Variables de entorno configuradas en `.env.local` (DATABASE_URL, AUTH_SECRET, etc.)
3. Datos seed cargados: `pnpm db:seed` (necesario para consumer mirror tests)

## Validation Scenarios

### Scenario 1: Contract tests pass with current snapshots

```bash
pnpm test:contract
```

**Expected**: Todos los tests pasan. Los snapshots existentes coinciden con los schemas actuales.

### Scenario 2: Snapshot divergence detection

1. Modificar manualmente un schema zod (ej: en `src/features/api-public/schemas/promocion-response.schema.ts`, cambiar un campo required a optional).
2. Ejecutar `pnpm test:contract`.

**Expected**: El test de no-divergencia falla con mensaje claro indicando el campo y el cambio.

### Scenario 3: Update snapshots after intentional change

1. Tras modificar un schema (scenario 2), ejecutar `pnpm test:contract -- --update`.
2. Volver a ejecutar `pnpm test:contract`.

**Expected**: Los snapshots se actualizan y todos los tests pasan.

### Scenario 4: OpenAPI endpoint serves valid spec

1. Autenticarse como admin en el backoffice.
2. Hacer GET /api/internal/docs (con cookies de sesión).

**Expected**: Respuesta 200 con spec OpenAPI 3.0 válido en JSON. El spec incluye paths `/api/v1/promociones` y `/api/v1/leads/institutional`.

### Scenario 5: OpenAPI endpoint requires authentication

1. Sin autenticación, hacer GET /api/internal/docs.

**Expected**: Respuesta 401 Unauthorized.

### Scenario 6: Consumer mirror tests validate real endpoints

```bash
pnpm test:contract -- tests/contract/v1/consumer-mirror.contract.spec.ts
```

**Expected**: Los tests hacen requests reales a los endpoints (con API key de test), verifican status codes, headers, y que el body valida contra los schemas zod.

### Scenario 7: Rate limiting contract test

```bash
pnpm test:contract -- tests/contract/v1/rate-limit.contract.spec.ts
```

**Expected**: El test verifica que el endpoint puede responder 429 cuando el rate limit se supera (o pasa en modo degraded si no hay Redis).

## Troubleshooting

- **Tests fallan con "snapshot mismatch"**: Los schemas cambiaron. Si el cambio es intencional, ejecutar con `--update`. Si no, revertir el cambio en el schema.
- **OpenAPI endpoint retorna 401**: Verificar que la sesión está activa (cookies de Auth.js).
- **Consumer mirror tests fallan con 401**: Verificar que la API key de test es válida y está activa en la BD.
- **Rate limit test falla**: Verificar que Redis está configurado (RATE_LIMIT_STORE_URL en .env.local) o aceptar que el test pasa en modo degraded.
