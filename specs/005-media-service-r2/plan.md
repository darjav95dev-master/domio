# Implementation Plan: media-service-r2

**Branch**: `feature/006-media-service-r2` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-media-service-r2/spec.md`

## Summary

Implement `MediaService` in `src/infrastructure/media/` — a Cloudflare R2 client with S3-compatible API. The service provides server-side image upload, signed URL generation for private documents, gallery reorder/set-cover operations, and deletion. The upload endpoint (`POST /api/internal/media/upload`) receives binary from the backoffice, validates alt_text and MIME type before touching R2, stores the file, and persists a `media_assets` record. The existing `MediaImage` component (F003) is reused without modification — it already handles R2 URLs via `next/image` remote patterns and provides a deterministic fallback gradient on load failure. Environment variable validation follows the pattern established in `src/infrastructure/tenant/env.ts`.

## Technical Context

**Language/Version**: TypeScript 5.x strict (`"strict": true`)
**Primary Dependencies**: @aws-sdk/client-s3 (S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand), @aws-sdk/s3-request-presigner (getSignedUrl), @aws-sdk/lib-storage (Upload for streaming), Drizzle ORM, Next.js 15 App Router, Zod, Vitest
**Storage**: Cloudflare R2 (S3-compatible API) for file storage; PostgreSQL 16 (Neon) for `media_assets` table
**Testing**: Vitest (unit + integration), coverage ≥ 80% on `src/infrastructure/media/`
**Target Platform**: Vercel (serverless) + development (localhost); R2 endpoint: `https://<account_id>.r2.cloudflarestorage.com`
**Project Type**: web-service (Next.js full-stack)
**Performance Goals**: Upload < 5s for < 10MB image under normal network; signed URL generation < 50ms
**Constraints**: Server-side upload only (no R2 credentials to browser); `alt_text` NOT NULL enforced at DB + service layer; 10 MB max upload size; MIME type whitelist (image/jpeg, image/png, image/webp, image/avif, application/pdf)
**Scale/Scope**: 1 MediaService class (5 methods), 1 API route handler, 1 env validation module, unit + integration tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Repository Pattern (§2) | ✅ PASS | MediaService uses Drizzle directly for `media_assets` table following the same transactional pattern as repositories |
| TDD (§3) — RED → GREEN → REFACTOR | ✅ PASS | All MediaService methods tested first (RED), implementation follows (GREEN) |
| Scope Rule (§2) | ✅ PASS | `src/infrastructure/media/` for service + env; `app/api/internal/media/` for route handler |
| TypeScript strict (§1) | ✅ PASS | No `any`, no `@ts-ignore` |
| Coverage ≥ 80% (§3) | ✅ PASS | Target 80%+ on `src/infrastructure/media/` |
| SET LOCAL rule (§2.2, architecture) | ✅ PASS | Upload route writes to `media_assets` within authenticated context; R2 operations are external and don't need SET LOCAL |
| Server-side upload (§3, architecture) | ✅ PASS | Never emit R2 credentials to browser; upload binary → server → R2 |
| alt_text NOT NULL (§3, architecture) | ✅ PASS | DB schema already enforces; service layer rejects before R2 write |
| Security — no secrets in code (§5) | ✅ PASS | R2 credentials from `.env.local` validated at startup; `.env` never committed |
| URL patterns (§9, architecture) | ✅ PASS | All `<img src>` through MediaImage or next/image with R2 remote pattern |
| Dependencies explicit (§11.2) | ✅ PASS | F006 declares F001 dependency; MediaImage from F003 is reused, not reimplemented |

**Gate Result: ALL PASS** — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-media-service-r2/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API route contract)
├── tasks.md             # Phase 2 output (/speckit-tasks)
└── checklists/
    └── requirements.md  # Spec quality validation
```

### Source Code (repository root) — files this feature creates/modifies

```text
src/
├── infrastructure/
│   ├── media/
│   │   ├── media.service.ts        # NEW: MediaService class (5 methods)
│   │   ├── env.ts                  # NEW: R2 env var validation
│   │   ├── types.ts                # NEW: UploadInput, TransformOptions, etc.
│   │   └── r2-client.ts            # NEW: S3Client singleton for R2
│   ├── db/
│   │   └── schema/
│   │       └── media-assets.ts     # EXISTS (F002): schema already complete
│   └── tenant/
│       └── env.ts                  # EXISTS: reference pattern for env validation
├── shared/
│   └── components/
│       └── media-image.tsx          # EXISTS (F003): reused without modification

app/
├── api/
│   └── internal/
│       └── media/
│           └── upload/
│               └── route.ts        # NEW: POST handler for upload

tests/
├── unit/
│   └── media/
│       ├── media.service.test.ts   # NEW: Unit tests for all MediaService methods
│       └── env.test.ts             # NEW: Env validation tests
└── integration/
    └── media/
        └── upload.test.ts          # NEW: Integration test for upload endpoint

.env.example                         # MODIFY: R2 vars already declared, verify correctness
```

**Structure Decision**: Single Next.js project with infrastructure services in `src/infrastructure/`. The `media/` directory follows the same pattern as `tenant/` — a self-contained infrastructure module with its own service, types, and env validation. The API route handler lives under `app/api/internal/media/` to keep the HTTP layer separate from the service. No frontend changes needed (MediaImage is reused as-is).

## Complexity Tracking

> No violations. All gates pass.
