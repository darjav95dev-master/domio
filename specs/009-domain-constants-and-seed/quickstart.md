# Quickstart Validation: Domain Constants & Seed

**Feature**: 009 | **Date**: 2026-07-08

## Prerequisites

- Node.js >= 20
- pnpm 9.x
- Base de datos PostgreSQL accesible vía `DATABASE_URL` en `.env`
- Migraciones ejecutadas: `pnpm db:migrate`

## Validation Scenarios

### V-1: Constantes y labels compilan

```bash
pnpm typecheck
```

**Expected**: Sin errores. Los archivos `domain-labels.ts` y `domain-config.ts` exportan tipos correctos.

### V-2: Tests de constantes pasan

```bash
pnpm vitest run tests/unit/constants.test.ts --reporter=dot
```

**Expected**: Todos los tests pasan. Verifica:
- Inmutabilidad de arrays `as const`
- Exhaustividad de labels (todos los valores de cada enum tienen label)
- Constantes de configuración tienen valores positivos

### V-3: Tests de schemas Zod pasan

```bash
pnpm vitest run tests/unit/schemas.test.ts --reporter=dot
```

**Expected**: Todos los tests pasan. Verifica:
- Payloads válidos son aceptados por cada schema
- Payloads inválidos son rechazados con errores descriptivos
- Enums en schemas coinciden con las constantes

### V-4: Script de seed ejecuta exitosamente

```bash
pnpm db:seed
```

**Expected**: Output indicando cuántos registros se insertaron por tabla. Sin errores.

### V-5: Datos seed son consultables

Tras ejecutar el seed, verificar con queries directas:

```bash
pnpm db:studio
```

O con SQL directo:

```sql
SELECT COUNT(*) FROM tenants WHERE slug = 'domio';           -- 1
SELECT COUNT(*) FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'domio');  -- 5+
SELECT COUNT(*) FROM promociones WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'domio');  -- 8
SELECT COUNT(*) FROM leads WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'domio');  -- 5
```

### V-6: Seed es idempotente

```bash
pnpm db:seed && pnpm db:seed
```

**Expected**: La segunda ejecución no duplica datos. Los conteos de V-5 se mantienen.

### V-7: Suite completa verde

```bash
pnpm quality
```

**Expected**: lint + typecheck + tests pasan sin errores.

## Troubleshooting

- **Error `DATABASE_URL not defined`**: Verificar que `.env` existe y tiene `DATABASE_URL`.
- **Error de migraciones**: Ejecutar `pnpm db:migrate` antes del seed.
- **Error de permisos RLS**: El seed debe ejecutar con el rol de la BD que tiene permisos de bypass RLS (el rol de conexión de Neon), o bien desactivar RLS temporalmente para el seed.
