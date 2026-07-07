# Quickstart: media-service-r2

**Feature**: F006 · media-service-r2 | **Date**: 2026-07-07

## Prerequisites

1. **F001 (bootstrap-project)** complete — Next.js 15 dev server running, pnpm, Vitest, TypeScript strict
2. **F002 (db-schema-and-migrations)** complete — `media_assets` table created with indexes, constraints, and RLS
3. **R2 bucket provisioned** with dev credentials in `.env.local`:
   ```env
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET=domio-dev-media
   R2_PUBLIC_URL=https://pub-<hash>.r2.dev
   ```
4. **Database running** — `pnpm db:migrate` executed against Neon dev branch
5. **pnpm dev** running on `http://localhost:3000`

## Validation Scenarios

### Scenario 1: Unit — Env validation at startup

```bash
# Verify the app fails fast with missing R2 credentials
R2_ACCOUNT_ID="" pnpm dev
# Expected: Error "R2_ACCOUNT_ID environment variable is not defined"

# Verify the app starts with valid credentials
pnpm dev
# Expected: App starts normally
```

### Scenario 2: Unit — MediaService.uploadImage rejects invalid input

```bash
pnpm vitest run tests/unit/media/media.service.test.ts --reporter=dot
```

Tests verify:
- Upload rejects empty alt_text (before R2 call)
- Upload rejects files > 10 MB
- Upload rejects unsupported MIME types
- Upload rejects invalid kind values
- Upload generates unique r2_key preserving extension

### Scenario 3: Integration — End-to-end upload flow

```bash
pnpm vitest run tests/integration/media/upload.test.ts --reporter=dot
```

Tests verify:
- `POST /api/internal/media/upload` with valid FormData → 201 + asset metadata
- Upload with missing alt_text → 422 with field-level error
- Upload with file > 10 MB → 413
- Upload with unsupported MIME type → 422
- Upload without auth → 401
- Uploaded file exists in R2 bucket (dev)
- Database record created with correct kind and tenant_id

### Scenario 4: Manual — Upload via curl (dev only)

```bash
# Requires valid session cookie from Auth.js login
curl -X POST http://localhost:3000/api/internal/media/upload \
  -b "authjs.session-token=<token>" \
  -F "file=@/path/to/test-image.jpg" \
  -F "altText=A test image of a living room" \
  -F "kind=IMAGE_GALLERY" \
  -F "ownerId=<valid-promotion-uuid>"
```

Expected: 201 response with asset metadata JSON.

### Scenario 5: Unit — MediaService.signedReadUrl

```bash
pnpm vitest run tests/unit/media/media.service.test.ts --reporter=dot --grep "signedReadUrl"
```

Verified:
- Generates URL for DOCUMENT kind with TTL ≈ 3600s
- Generates public URL (not signed) for IMAGE_GALLERY kind
- URL expires after TTL (verify access denied)

### Scenario 6: Unit — MediaService.reorderGallery + setCover

```bash
pnpm vitest run tests/unit/media/media.service.test.ts --reporter=dot --grep "reorderGallery|setCover"
```

Verified:
- Reorder updates all sort_order values atomically
- setCover ensures exactly one is_cover = true per owner
- Empty reorder is a no-op
- Setting same image as cover is idempotent

## Full Suite

```bash
pnpm vitest run --reporter=dot  # unit + integration
pnpm typecheck                   # TypeScript strict
pnpm build                       # Production build
```

All must pass green before the feature is considered complete.
