# Quickstart: E2E Tests Validation

**Feature**: 026-e2e-tests | **Date**: 2026-07-09

## Prerequisites

1. Base de datos Neon accesible con `DATABASE_URL` configurada en `.env.local`
2. Variables de entorno completas (ver `.env.example`)
3. Datos seed cargados: `pnpm db:seed`
4. Dependencias instaladas: `pnpm install`
5. Playwright browsers instalados: `npx playwright install chromium`

## Validation Scenarios

### Scenario 1: Visitor Journey (Journey 1)

```bash
pnpm test:e2e -- tests/e2e/visitor.spec.ts
```

**Expected**: 
- Home carga con hero, portafolio destacado, bloques, footer
- Portafolio filtra correctamente (URL refleja filtros)
- Ficha de detalle muestra galería, infobar, bloques, tipologías, mapa
- Formulario de contacto con consentimiento crea lead y muestra confirmación

### Scenario 2: Catalog Editor Journey (Journey 2)

```bash
pnpm test:e2e -- tests/e2e/catalog-editor.spec.ts
```

**Expected**:
- Login como operador1@domio.dev funciona
- Listado de catálogo muestra promociones con filtros
- Edición de promoción con autoguardado funciona
- Publicación refleja cambios en ficha pública

### Scenario 3: Sales Agent Journey (Journey 3)

```bash
pnpm test:e2e -- tests/e2e/sales-agent.spec.ts
```

**Expected**:
- Login como agente1@domio.dev funciona
- Badge de leads no leídos muestra conteo correcto
- Abrir lead lo marca como leído, badge decrementa
- Cambios de estado (NEW → CONTACTED → WON) persisten
- Nota interna se guarda correctamente
- RLS: agente1 no ve leads de agente2

### Scenario 4: API Consumer Journey (Journey 4)

```bash
pnpm test:e2e -- tests/e2e/api-consumer.spec.ts
```

**Expected**:
- GET /api/v1/promociones con API key devuelve solo portfolio+PUBLISHED
- Respuesta no incluye coordenadas exactas para modo AREA
- POST /api/v1/leads/institutional con consentimiento devuelve 201
- POST sin consentimiento devuelve 422

### Scenario 5: Admin Journey (Journey 5)

```bash
pnpm test:e2e -- tests/e2e/admin.spec.ts
```

**Expected**:
- Login como admin@domio.dev funciona
- Creación de nuevo agente funciona
- Creación y revocación de API key funciona
- Edición de configuración de contacto se refleja en footer público
- Ejercicio ARSOP de borrado elimina lead en cascada

### Scenario 6: Full Suite

```bash
pnpm test:e2e
```

**Expected**: Todos los tests pasan. Duración total < 5 minutos.

## Troubleshooting

- **Tests fallan con "page not found"**: Verificar que `pnpm dev` arranca correctamente en puerto 3000
- **Login falla**: Verificar que seed está cargado (`pnpm db:seed`) y credenciales son correctas
- **API tests fallan con 401**: Verificar que API key fue creada correctamente en beforeAll
- **DB reset falla**: Verificar que DATABASE_URL apunta a BD de desarrollo (no producción)
- **Timeouts**: Aumentar `timeout` en playwright.config.ts solo para debugging, no commitear
