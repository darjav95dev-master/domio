# API Contract: POST /api/internal/media/upload

**Feature**: F006 · media-service-r2  
**Version**: 1.0  
**Authentication**: Required — authenticated session (Auth.js v5 JWT) with valid tenant context

## Request

```
POST /api/internal/media/upload
Content-Type: multipart/form-data
```

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (binary) | Yes | Image or document file. Max 10 MB. |
| `altText` | string | Yes | Alt text, 1-500 chars, non-empty, non-whitespace-only |
| `kind` | string | Yes | One of: `IMAGE_GALLERY`, `PLAN`, `DOCUMENT` |
| `ownerId` | string | Yes | UUID of the owning promotion |

### Example (curl)

```bash
curl -X POST http://localhost:3000/api/internal/media/upload \
  -H "Cookie: <session-cookie>" \
  -F "file=@photo.jpg" \
  -F "altText=Living room with sea view" \
  -F "kind=IMAGE_GALLERY" \
  -F "ownerId=a4c9f123-4567-89ab-cdef-0123456789ab"
```

## Success Response

### 201 Created

```json
{
  "asset": {
    "id": "b8d7e654-3210-fedc-ba98-76543210fedc",
    "kind": "IMAGE_GALLERY",
    "r2Key": "a4c9f123-89ab-cdef-0123-456789abcdef.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 2048576,
    "altText": "Living room with sea view",
    "sortOrder": 0,
    "isCover": false,
    "createdAt": "2026-07-07T12:00:00.000Z"
  }
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```
No valid session cookie or JWT.

### 413 Content Too Large
```json
{
  "error": "File size exceeds maximum allowed (10 MB)"
}
```

### 422 Unprocessable Entity
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "altText",
      "message": "alt_text is required and must be between 1 and 500 characters"
    }
  ]
}
```

Possible validation errors:
- `file`: "File is required", "File is empty", "Unsupported file type"
- `altText`: "alt_text is required and must be between 1 and 500 characters"
- `kind`: "Invalid kind. Must be IMAGE_GALLERY, PLAN, or DOCUMENT"
- `ownerId`: "owner_id must be a valid UUID"

### 500 Internal Server Error
```json
{
  "error": "Upload failed. Please try again."
}
```
Internal failures (R2 unavailable, DB error) return a generic message — no internal details exposed.

### 503 Service Unavailable
```json
{
  "error": "Media storage is temporarily unavailable. Please try again later."
}
```
R2 is unreachable after retry.
