# Feature Specification: media-service-r2

**Feature Branch**: `feature/006-media-service-r2`

**Created**: 2026-07-07

**Status**: Draft

**Input**: Brief from feature-briefer for F006 · media-service-r2 — Cloudflare R2 client with S3-compatible interface. MediaService in `src/infrastructure/media/` with methods: uploadImage, signedReadUrl, reorderGallery, setCover, delete. Upload always from server. Signed URLs with short TTL. On-demand transforms (WebP/AVIF, responsive sizes). Reuses existing MediaImage component from F003. alt_text NOT NULL enforced. Categorization by kind: IMAGE_GALLERY, PLAN, DOCUMENT.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Image from Backoffice (Priority: P1)

An operator or agent in the backoffice selects an image file from their computer and uploads it to associate it with a promotion. The system stores the file in Cloudflare R2, creates a media asset record with required alt text and categorization, and confirms the upload was successful.

**Why this priority**: Image upload is the foundational operation of the media service. Without upload capability, no other media operations (signing URLs, rendering, reordering) have data to work with. The entire catalog's visual layer depends on this working first.

**Independent Test**: Can be fully tested by sending a multipart form upload to the internal upload endpoint and verifying that (a) the file exists in the R2 bucket, (b) a media_assets record is created with correct kind and alt_text, and (c) the response includes the asset metadata.

**Acceptance Scenarios**:

1. **Given** an authenticated operator and a valid image file with required alt_text and kind set to IMAGE_GALLERY, **When** the operator uploads the image via the internal upload endpoint, **Then** the file is stored in R2, a media_assets record is persisted with the correct metadata, and the response returns the asset ID and metadata.
2. **Given** an authenticated operator and an image file without alt_text, **When** the operator attempts to upload, **Then** the system rejects the upload with a 422 error before touching R2, and the error message specifies that alt_text is required.
3. **Given** an authenticated operator and a file that exceeds the maximum allowed size (10 MB), **When** the operator attempts to upload, **Then** the system rejects the upload with a 413 error and no R2 operation is performed.
4. **Given** an authenticated operator and a file with an unsupported MIME type (not image/jpeg, image/png, image/webp, image/avif, application/pdf), **When** the operator attempts to upload, **Then** the system rejects the upload with a 422 error specifying the allowed types.

---

### User Story 2 - View Image via MediaImage Component (Priority: P1)

A visitor browsing the public catalog or an operator in the backoffice sees images rendered correctly with the MediaImage component. The component loads the image from the R2-backed URL, applies responsive sizing, and gracefully degrades to a deterministic fallback gradient if the image fails to load.

**Why this priority**: Rendering images is the consumer-facing outcome of upload. If images can't be viewed, the upload capability delivers no user value. This story validates the full pipeline from storage to display.

**Independent Test**: Can be tested by providing a valid R2-backed URL to the MediaImage component, verifying the image renders, then simulating a broken URL and verifying the fallback gradient appears.

**Acceptance Scenarios**:

1. **Given** a published image has been uploaded to R2 and a media_assets record exists with a valid r2_key, **When** MediaImage renders using the asset, **Then** the image displays correctly at the expected dimensions and format.
2. **Given** an image URL that fails to load (network error, deleted asset, expired signed URL), **When** MediaImage attempts to render it, **Then** the component displays the deterministic fallback gradient (`linear-gradient(135deg, ink-2, ink)`) instead of a broken image icon.
3. **Given** a visitor with `prefers-reduced-motion: reduce`, **When** MediaImage renders with a loading state or transition animation, **Then** animations are disabled and the image renders statically.

---

### User Story 3 - Delete Media Asset (Priority: P2)

An operator removes an image, plan, or document that is no longer needed from a promotion. The system deletes the file from R2 and removes the corresponding media_assets record, ensuring no orphaned references remain.

**Why this priority**: Deletion is necessary for content management but can be deferred — operators can work around missing delete by uploading replacements. However, without delete, unused assets accumulate in R2, increasing storage costs.

**Independent Test**: Can be tested by creating a media asset, invoking the delete method, and verifying both the R2 object and the database record are removed.

**Acceptance Scenarios**:

1. **Given** an existing media_assets record with a file stored in R2, **When** the operator deletes the asset, **Then** the file is removed from R2 and the database record is deleted within a single logical operation.
2. **Given** an asset that is currently the cover image (`is_cover = true`) of a promotion, **When** the operator deletes it, **Then** the deletion succeeds and `is_cover` is cleared for that promotion.
3. **Given** an asset ID that does not exist, **When** the operator attempts to delete it, **Then** the system returns a 404 error.

---

### User Story 4 - Reorder Gallery Images (Priority: P2)

An operator rearranges the order of images in a promotion's gallery. The system updates the `sort_order` for all affected assets atomically, preserving consistency even if the operation is interrupted.

**Why this priority**: Gallery order directly impacts the first impression of a promotion listing. However, the default order (by upload time) is acceptable until reordering is needed for presentation polish.

**Independent Test**: Can be tested by creating three assets for a promotion, invoking reorderGallery with a new ordering, and verifying all sort_order values match the requested order.

**Acceptance Scenarios**:

1. **Given** a promotion with three images in sort order [1, 2, 3] corresponding to asset IDs [A, B, C], **When** the operator reorders them to [C, A, B], **Then** the database reflects sort_order values consistent with the new order, and the operation completes atomically.
2. **Given** a promotion with no images, **When** reorderGallery is called with an empty array, **Then** the operation is a no-op and returns successfully.

---

### User Story 5 - Set Cover Image (Priority: P2)

An operator designates one image as the cover (primary) image for a promotion. The system ensures only one image can be the cover at a time, replacing any previous cover designation.

**Why this priority**: Cover image selection is important for catalog presentation but can initially default to the first uploaded image.

**Independent Test**: Can be tested by setting an image as cover for a promotion, then setting a different image as cover, and verifying exactly one image has `is_cover = true`.

**Acceptance Scenarios**:

1. **Given** a promotion with multiple images and no current cover, **When** the operator sets image A as cover, **Then** image A has `is_cover = true` and all other images have `is_cover = false`.
2. **Given** a promotion where image A is already the cover, **When** the operator sets image B as cover, **Then** image B becomes the cover, image A is no longer the cover, and the operation is atomic.

---

### User Story 6 - Access Private Documents via Signed URLs (Priority: P3)

An authenticated user requests access to a private document (plan or document kind) stored in R2. The system generates a time-limited signed URL that allows temporary access to the file, after which the URL expires and access is denied.

**Why this priority**: Private document access is required for plans and legal documents but has a smaller user base than public gallery images. The signed URL pattern is well-established with R2/S3 SDKs.

**Independent Test**: Can be tested by generating a signed URL for a document, accessing it within the TTL window (succeeds), then accessing it after the TTL expires (fails).

**Acceptance Scenarios**:

1. **Given** a media_assets record of kind DOCUMENT with a file stored in R2, **When** a signed URL is requested with a 60-minute TTL, **Then** the returned URL grants access to the file for 60 minutes, after which it returns an access denied response.
2. **Given** a media_assets record of kind IMAGE_GALLERY (public), **When** a signed URL is requested, **Then** the system returns a public CDN URL instead of a signed URL, since gallery images do not require signed access.

---

### Edge Cases

- **Empty upload**: What happens when the uploaded file has 0 bytes? The system rejects it with a 422 error before any R2 operation.
- **Concurrent cover changes**: If two operators try to set different images as cover for the same promotion simultaneously, the database constraint (`UNIQUE WHERE is_cover = true`) ensures only one succeeds; the other receives a conflict error.
- **R2 unavailable**: If Cloudflare R2 is temporarily unreachable during upload, the system returns a 503 error to the client with a clear message, and no partial database record is created (the upload is transactional: R2 first, then DB).
- **Very large files**: Files exceeding 10 MB are rejected at the API boundary before any R2 operation, preventing unnecessary network transfer.
- **Filename collisions**: Two files with the same original filename uploaded to the same promotion must not collide in R2. The service generates unique keys (e.g., UUID-based) for each upload.
- **Invalid alt_text**: alt_text that is an empty string, whitespace-only, or exceeds 500 characters is rejected before R2 operations.
- **Duplicate cover setting**: Setting the same image as cover when it already is the cover is a no-op (idempotent).
- **Reorder with invalid IDs**: If reorderGallery receives an asset ID that doesn't belong to the specified promotion, the operation rejects with a validation error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a server-side upload endpoint that accepts multipart form data containing an image file, alt_text, kind (IMAGE_GALLERY, PLAN, or DOCUMENT), and owner_id (promotion reference), stores the file in Cloudflare R2, and creates a corresponding media_assets record.
- **FR-002**: System MUST validate upload payload before any R2 operation: file size ≤ 10 MB, MIME type in [image/jpeg, image/png, image/webp, image/avif, application/pdf], alt_text present and non-empty (max 500 chars), kind in valid enum.
- **FR-003**: System MUST generate unique storage keys for each uploaded file to prevent collisions, preserving the original file extension for content-type detection.
- **FR-004**: System MUST provide a method to generate signed read URLs for private assets (kind DOCUMENT) with configurable TTL (default 60 minutes).
- **FR-005**: System MUST provide a method to reorder gallery assets for a given owner_id atomically, updating sort_order values for all affected assets within a single transaction.
- **FR-006**: System MUST provide a method to set a single asset as the cover image for its owner_id, ensuring at most one cover exists per owner at any time.
- **FR-007**: System MUST provide a method to delete a media asset that removes both the R2 object and the database record as a logical unit.
- **FR-008**: System MUST enforce `alt_text` as a required field (NOT NULL) at the database level; the service layer MUST additionally validate alt_text before any R2 write.
- **FR-009**: System MUST categorize assets by `kind` (IMAGE_GALLERY, PLAN, DOCUMENT) and ensure this categorization determines whether the asset uses a public URL or a signed URL.
- **FR-010**: System MUST validate R2 credentials (account ID, access key, secret key, bucket name) at application startup using Zod, following the pattern established in `src/infrastructure/tenant/env.ts`.
- **FR-011**: System MUST integrate with the existing MediaImage component (from F003, `src/shared/components/`) for rendering images with graceful fallback — no new image rendering component may be created.
- **FR-012**: System MUST log structured errors for R2 operations (upload failures, signed URL generation failures) without exposing R2 credentials or internal paths in error messages returned to clients.
- **FR-013**: System MUST reject upload requests for files with unsupported MIME types before initiating an R2 transfer, returning a 422 error with the list of allowed types.

### Key Entities

- **MediaAsset**: Represents a stored media file. Attributes: id (unique identifier), tenant_id (multi-tenant isolation), owner_type and owner_id (polymorphic reference, initially promotions), kind (IMAGE_GALLERY | PLAN | DOCUMENT), alt_text (required, non-empty, ≤500 chars), r2_key (unique storage key in the R2 bucket), filename (original upload filename), mime_type (validated on upload), size_bytes (file size), sort_order (position in gallery), is_cover (boolean, at most one true per owner), width and height (image dimensions, nullable for documents), created_at, updated_at.

- **UploadInput**: Input contract for the upload operation. Attributes: file (binary buffer or stream), alt_text (validated string), kind (enum), owner_id (string), owner_type (string, default "promotion").

- **TransformOptions**: Optional parameters for image transformation. Attributes: width, height, format (webp | avif | jpeg | auto), quality (1-100).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can upload an image with alt text and see it rendered on screen within 5 seconds under normal network conditions.
- **SC-002**: Uploads without alt_text are rejected 100% of the time with a clear error message before any file is stored in R2.
- **SC-003**: The MediaImage component renders the deterministic fallback gradient within 2 seconds of an image load failure, with no broken image icon visible.
- **SC-004**: Gallery reordering for up to 50 images completes atomically — no partial state is observable even if the operation is interrupted.
- **SC-005**: Signed URLs for documents grant access for exactly the requested TTL (±2 seconds tolerance) and deny access after expiration.
- **SC-006**: All R2 credentials are validated at application startup; a missing or invalid credential prevents the application from starting with a clear error message.
- **SC-007**: The system correctly categorizes assets by kind and serves public URLs for IMAGE_GALLERY and signed URLs for DOCUMENT assets without cross-contamination.

## Assumptions

- **R2 bucket and credentials exist**: A Cloudflare R2 bucket for development is already provisioned with the appropriate access keys. The `.env.example` file already declares the required R2 environment variables (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`).
- **F001 is complete**: The project scaffold (Next.js 15, App Router, TypeScript strict, pnpm, Vitest) is in place and working. The `media_assets` table schema from F002 is available in the codebase.
- **MediaImage from F003 is stable**: The shared MediaImage component exists at `src/shared/components/media-image.tsx` with its current props interface. This feature adapts to the existing interface rather than modifying it.
- **No direct browser-to-R2 upload**: All uploads go through the server. The client sends files to a Next.js Route Handler, which then interacts with R2. This is a hard architectural rule, not an assumption.
- **Single R2 bucket per environment**: Development and production each have one R2 bucket. No multi-bucket routing is needed.
- **Tenant context available**: The upload endpoint operates within an authenticated context (backoffice). The tenant_id for media_assets is derived from the session, not from the request body.
- **Next.js image optimization applies**: For public images, `next/image` with R2 as a configured remote pattern handles responsive sizing and format conversion. The MediaService does not implement its own image processing pipeline beyond the R2 S3 API.
- **Maximum 10 MB upload size**: This is a product decision for the MVP, not a technical limitation. It prevents abuse while accommodating high-resolution photography.
