# Data Model: Media Gallery Backoffice

**Feature**: F013 — Media Gallery Backoffice
**Date**: 2026-07-08

## Existing Entities (no changes to schema)

### media_assets (ya existe desde F002)

| Campo | Tipo | Nullable | Default | Notas |
|-------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| tenant_id | uuid | NO | — | FK → tenants.id, ON DELETE CASCADE |
| owner_id | uuid | NO | — | FK → promociones.id (cuando owner_type='PROMOCION') |
| owner_type | media_asset_owner_type | NO | — | 'PROMOCION', 'TIPOLOGIA', 'CONTENT' |
| kind | media_asset_kind | NO | — | 'IMAGE_GALLERY', 'PLAN', 'DOCUMENT' |
| url | text | NO | — | URL firmada de R2 |
| alt_text | text | NO | — | Texto alternativo obligatorio |
| sort_order | integer | NO | 0 | Orden dentro de su kind |
| is_cover | boolean | YES | false | Solo una portada por owner (constraint parcial UNIQUE) |
| created_at | timestamptz | NO | now() | Fecha de creación |
| updated_at | timestamptz | NO | now() | Última modificación |

**Índices existentes**:
- `media_assets_tenant_owner_idx` ON (tenant_id, owner_id, owner_type)
- Constraint parcial UNIQUE: `(tenant_id, owner_id) WHERE is_cover = true`

### MediaKind (enum existente)

Valores: `IMAGE_GALLERY`, `PLAN`, `DOCUMENT`

## MediaService Methods (ya implementados en F006)

| Método | Descripción |
|--------|-------------|
| `uploadImage(tenantId, ownerId, ownerType, kind, file, altText)` | Sube archivo a R2, crea registro en media_assets |
| `signedReadUrl(assetId)` | Genera URL firmada para leer archivo de R2 |
| `reorderGallery(ownerId, orderedAssetIds)` | Actualiza sort_order de todos los assets en transacción atómica |
| `setCover(ownerId, assetId)` | Marca un asset como portada, desmarca los demás |
| `delete(assetId)` | Elimina archivo de R2 y registro de media_assets |

## Server Actions (new)

| Action | Descripción |
|--------|-------------|
| `uploadMediaAction(promocionId, kind, file, altText)` | Invoca MediaService.uploadImage, valida alt_text |
| `reorderMediaAction(promocionId, kind, orderedAssetIds)` | Invoca MediaService.reorderGallery |
| `setCoverAction(promocionId, assetId)` | Invoca MediaService.setCover |
| `deleteMediaAction(promocionId, assetId)` | Invoca MediaService.delete |
| `validateMediaForPublish(promocionId)` | Verifica: ≥1 imagen galería + alt_text en todos |

## Validation Rules

- **Cliente**: Zod schema valida alt_text no vacío antes de enviar
- **Servidor**: Mismo Zod schema valida antes de invocar MediaService
- **BD**: alt_text NOT NULL en schema de media_assets
- **Publicación**: Si no hay imágenes o falta alt_text, se bloquea el cambio a PUBLISHED

## Constraint Parcial UNIQUE

```sql
-- Ya existe en el schema de F002
CREATE UNIQUE INDEX media_assets_cover_unique
ON media_assets (tenant_id, owner_id)
WHERE is_cover = true;
```

Garantiza que solo una imagen por promoción puede ser portada.
