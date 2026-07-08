# Quickstart Validation: Leads Management

**Feature**: F014 — Leads Management
**Date**: 2026-07-08

## Prerequisites

- BD Neon con migraciones aplicadas (`pnpm db:migrate`)
- Seed ejecutado (`pnpm db:seed`) — incluye leads demo
- Servidor corriendo (`pnpm dev`)
- Usuarios autenticados: admin@domio.test, agent1@domio.test, agent2@domio.test

## Validation Scenarios

### 1. Bandeja con scope por agente
1. Login como agent1 → `/panel/leads/` → ve solo sus leads
2. Login como admin → `/panel/leads/` → ve todos los leads
3. Login como operator → `/panel/leads/` → acceso denegado

### 2. Filtros
1. Filtrar por estado=NEW → solo leads NEW
2. Filtrar por source=commercial → solo commercial
3. Buscar por nombre → resultados filtrados

### 3. Detalle y notas
1. Abrir lead no leído → se marca como leído
2. Badge del nav decrementa
3. Añadir nota → aparece en lista cronológica

### 4. Máquina de estados
1. Lead NEW → cambiar a CONTACTED → histórico registra
2. Lead NEW → intentar cambiar a WON → rechazado

### 5. Reasignación
1. Admin reasigna lead de agent1 a agent2
2. Marcas de leído se borran
3. Agent2 ve el lead como no leído

### 6. Exportación CSV
1. Agent exporta → CSV con solo sus leads
2. Admin exporta → CSV con todos los leads

## Tests

```bash
pnpm vitest run tests/integration/lead-operations.test.ts
pnpm vitest run tests/unit/lead-validation.test.ts
```
