# Data Model: Editorial Blocks Editor

**Feature**: F012 — Editorial Blocks Editor
**Date**: 2026-07-08

## Existing Entities (no changes to schema)

### promocion_content_blocks (ya existe desde F002)

| Campo | Tipo | Nullable | Default | Notas |
|-------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| tenant_id | uuid | NO | — | FK → tenants.id, ON DELETE CASCADE |
| promocion_id | uuid | NO | — | FK → promociones.id, ON DELETE CASCADE |
| block_type | content_block_type (enum) | NO | — | DESCRIPCION_GENERAL, MEMORIA_CALIDADES, ZONAS_COMUNES, UBICACION_SERVICIOS, PLAZOS_GARANTIAS |
| payload | jsonb | YES | '{}' | Validado por Zod según block_type |
| sort_order | integer | NO | 0 | Orden de visualización |
| updated_by | uuid | YES | — | FK → users.id, ON DELETE SET NULL |
| updated_at | timestamptz | NO | now() | Última modificación |

**Índices existentes**:
- `promocion_content_blocks_tenant_promocion_idx` ON (tenant_id, promocion_id)

### content_block_type (enum existente)

Valores: `DESCRIPCION_GENERAL`, `MEMORIA_CALIDADES`, `ZONAS_COMUNES`, `UBICACION_SERVICIOS`, `PLAZOS_GARANTIAS`

## New Migration

### Trigger: restrict_blocks_by_kind

Se añade un trigger function y trigger para impedir INSERT/UPDATE de bloques `ZONAS_COMUNES` o `PLAZOS_GARANTIAS` en promociones `kind='external'`.

```sql
CREATE OR REPLACE FUNCTION check_block_kind_constraint()
RETURNS TRIGGER AS $$
DECLARE
  v_kind promocion_kind;
BEGIN
  SELECT kind INTO v_kind
  FROM promociones
  WHERE id = NEW.promocion_id;

  IF v_kind = 'external'
     AND NEW.block_type IN ('ZONAS_COMUNES', 'PLAZOS_GARANTIAS') THEN
    RAISE EXCEPTION 'Blocks of type % are not allowed for external promotions', NEW.block_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_block_kind
  BEFORE INSERT OR UPDATE ON promocion_content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION check_block_kind_constraint();
```

## Payload Schemas (Zod — ya definidos en shared/types/content-block-schema.ts)

### DESCRIPCION_GENERAL
```
{ text: string }  // HTML sanitizado (solo tags permitidos)
```

### MEMORIA_CALIDADES
```
{ items: Array<{ title: string, description: string, icon?: string }> }
```

### ZONAS_COMUNES (solo kind='portfolio')
```
{ items: Array<{ name: string, description: string }> }
```

### UBICACION_SERVICIOS
```
{ items: Array<{ service: string, distance: string }> }
```

### PLAZOS_GARANTIAS (solo kind='portfolio')
```
{ delivery?: string, license?: string, guarantee?: string, audit?: string }
```

## Repository Methods (new)

| Método | Descripción |
|--------|-------------|
| `findAllContentBlocks(promocionId)` | Devuelve todos los bloques de una promoción, ordenados por sort_order |
| `upsertContentBlock(promocionId, blockType, payload, userId)` | Crea o actualiza un bloque. Valida kind constraint antes de INSERT |
| `deleteContentBlock(promocionId, blockId)` | Elimina un bloque y reindexa sort_order |
| `reorderContentBlocks(promocionId, orderedBlockIds)` | Actualiza sort_order de todos los bloques en transacción atómica |
| `validateBlocksForPublish(promocionId)` | Verifica que todos los bloques existentes tienen payload válido (para bloqueo de publicación) |

## Validation Rules

- **Cliente**: Zod schema valida antes de enviar al servidor
- **Servidor**: Mismo Zod schema valida antes de persistir
- **BD**: Trigger function como última línea de defensa para constraint por kind
- **Publicación**: Si algún bloque tiene payload inválido, se bloquea el cambio a PUBLISHED
