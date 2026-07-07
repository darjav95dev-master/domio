# Data Model: media-service-r2

**Feature**: F006 · media-service-r2 | **Date**: 2026-07-07

## Existing Entity: MediaAsset

The `media_assets` table already exists (created in F002). This feature does NOT modify the schema — it builds the service layer on top of it.

### Table: `media_assets`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Auto-generated |
| `tenant_id` | UUID | NOT NULL, FK → tenants.id ON DELETE CASCADE | Multi-tenant isolation |
| `owner_type` | enum(`promotion`) | NOT NULL | Polymorphic reference type |
| `owner_id` | UUID | NOT NULL | Polymorphic reference ID |
| `kind` | enum(`IMAGE_GALLERY`, `PLAN`, `DOCUMENT`) | NOT NULL | Determines rendering + URL strategy |
| `r2_key` | TEXT | NOT NULL | Full key path in R2 bucket |
| `mime_type` | TEXT | NULLABLE | MIME type detected on upload |
| `size_bytes` | INTEGER | NULLABLE | File size in bytes |
| `alt_text` | TEXT | NOT NULL | Required; validated at service + DB level |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | Position in gallery |
| `is_cover` | BOOLEAN | NOT NULL, DEFAULT false | At most one true per (tenant_id, owner_id) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Upload timestamp |

### Indexes

| Index | Type | Columns | Condition |
|-------|------|---------|-----------|
| `media_assets_tenant_owner_idx` | BTREE | (tenant_id, owner_type, owner_id) | — |
| `media_assets_tenant_owner_cover_idx` | UNIQUE | (tenant_id, owner_id) | WHERE is_cover = true |
| `media_assets_gallery_sort_idx` | UNIQUE | (tenant_id, owner_id, sort_order) | WHERE kind = 'IMAGE_GALLERY' |

### RLS

`tenantIsolationPolicy("media_assets")` — filters by `tenant_id = current_setting('app.current_tenant_id')::uuid`

## Service Types

### UploadInput

```typescript
interface UploadInput {
  file: File | Buffer;       // Binary file content
  fileName: string;           // Original filename (for extension detection)
  mimeType: string;           // MIME type (validated against whitelist)
  altText: string;            // Non-empty, max 500 chars
  kind: "IMAGE_GALLERY" | "PLAN" | "DOCUMENT";
  ownerId: string;            // UUID of the promotion
  ownerType?: string;         // Default: "promotion"
}
```

### TransformOptions

```typescript
interface TransformOptions {
  width?: number;
  height?: number;
  format?: "webp" | "avif" | "jpeg" | "auto";
  quality?: number;           // 1-100
}
```

### MediaService Interface

```typescript
class MediaService {
  constructor(private readonly tenantId: string)
  
  uploadImage(input: UploadInput): Promise<MediaAsset>
  signedReadUrl(assetId: string, ttlSeconds?: number, opts?: TransformOptions): Promise<string>
  reorderGallery(ownerId: string, orderedAssetIds: string[]): Promise<void>
  setCover(ownerId: string, assetId: string): Promise<void>
  delete(assetId: string): Promise<void>
}
```

## Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| `altText` | Required, non-empty, non-whitespace, ≤500 chars | 422: "alt_text is required and must be between 1 and 500 characters" |
| `file.size` | ≤ 10 MB (10,485,760 bytes) | 413: "File size exceeds maximum allowed (10 MB)" |
| `file.mimeType` | Must be in [image/jpeg, image/png, image/webp, image/avif, application/pdf] | 422: "Unsupported file type. Allowed: image/jpeg, image/png, image/webp, image/avif, application/pdf" |
| `kind` | Must be one of IMAGE_GALLERY, PLAN, DOCUMENT | 422: "Invalid kind. Must be IMAGE_GALLERY, PLAN, or DOCUMENT" |
| `ownerId` | Must be a valid UUID | 422: "owner_id must be a valid UUID" |
| `file.size` | > 0 bytes | 422: "File is empty" |
