# Research: media-service-r2

**Feature**: F006 · media-service-r2 | **Date**: 2026-07-07

## Decision 1: S3 client library for R2

**Decision**: Use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`

**Rationale**: Cloudflare R2 exposes an S3-compatible API. The AWS SDK v3 is modular (tree-shakeable), well-maintained, and the standard choice for S3-compatible storage in Node.js. The `@aws-sdk/lib-storage` package provides streaming `Upload` for large files, though for this MVP we use `PutObjectCommand` for simplicity (max 10 MB).

**Alternatives considered**:
- `aws4fetch` — lighter but lacks S3-specific helpers (signed URLs, multipart upload)
- `@cloudflare/workers-sdk` R2 bindings — only works inside Cloudflare Workers, not Next.js serverless
- Raw `fetch` with signed headers — reimplements what the SDK provides out of the box

## Decision 2: Env validation pattern

**Decision**: Plain function validation (no Zod), following `src/infrastructure/tenant/env.ts`

**Rationale**: The existing project pattern uses simple validation functions that throw descriptive errors at module load time. This is sufficient for 4 string environment variables. Using Zod here would add a dependency for a use case that plain functions handle well.

**Alternatives considered**:
- Zod schema — more TypeScript-friendly but adds complexity the existing pattern doesn't need
- `t3-env` or `@next/env` — additional dependencies; the existing pattern is established and works

## Decision 3: R2 client lifecycle

**Decision**: Singleton S3Client created once at module load, configured with R2 endpoint

**Rationale**: The S3Client is stateless (auth is per-request via credentials). Creating it once avoids re-initialization on every request in serverless environments. The endpoint URL is `https://<account_id>.r2.cloudflarestorage.com`.

**Alternatives considered**:
- Per-request client — unnecessary overhead; S3Client handles connection pooling internally
- Lazy initialization — adds complexity; module-level singleton with validated env vars is cleaner

## Decision 4: Upload flow (server-side)

**Decision**: The Next.js Route Handler receives `FormData` (multipart), validates the file + metadata, uploads to R2 via `PutObjectCommand`, then inserts into `media_assets` via Drizzle within a transaction

**Rationale**: Server-side upload is the architectural rule (§3, architecture.md). The flow is: (1) validate input (file size, MIME type, alt_text, kind, owner_id), (2) generate unique `r2_key` using UUID + original extension, (3) PUT object to R2, (4) INSERT into `media_assets` with `SET LOCAL app.tenant_id`. If step 3 fails, no database record is created. If step 4 fails, the R2 object is orphaned (cleanup in a future iteration — acceptable for MVP).

**Alternatives considered**:
- R2 presigned POST URL → client uploads directly to R2 — **rejected**: this would expose R2 endpoint to the browser, violating the architectural rule
- Transactional R2+DB — R2 doesn't support transactions; we accept eventual cleanup of orphans

## Decision 5: Signed URL TTL

**Decision**: Default 60 minutes (3600 seconds), configurable per request

**Rationale**: 60 minutes is a reasonable default for document access in a B2B context — long enough to read a document, short enough to limit exposure if a URL leaks. The `signedReadUrl` method accepts an optional TTL parameter.

**Alternatives considered**:
- 15 minutes — too short for reading long documents
- 24 hours — unnecessary exposure for most use cases
- Per-kind defaults — unnecessary complexity for MVP; one default with override capability

## Decision 6: Unique R2 keys

**Decision**: UUID v4 + original file extension (e.g., `a4c9f123-4567-89ab-cdef-0123456789ab.jpg`)

**Rationale**: UUIDs guarantee uniqueness without coordination. Preserving the extension allows content-type detection by browsers and CDNs. The `media_assets.r2_key` is the full path within the bucket.

**Alternatives considered**:
- `tenant_id/owner_id/original_filename` — leaks internal IDs in URLs, creates collision risk on duplicate filenames
- Timestamp + random suffix — harder to guarantee uniqueness at scale

## Decision 7: Integration with MediaImage

**Decision**: No changes to the existing `MediaImage` component. It already accepts an `src` prop (passed to `next/image`) and handles errors via `onError` → fallback gradient. The R2 URL is simply passed as `src`.

**Rationale**: `MediaImage` wraps `next/image`, which already works with R2 when R2 is configured as a remote pattern in `next.config.ts`. No component changes needed.

**Alternatives considered**:
- Custom image component — unnecessary duplication; MediaImage handles the requirements
- Modifying MediaImage to accept r2_key instead of src — adds coupling to R2 without benefit
