export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
  "text/csv",
] as const;

export const ALLOWED_MEDIA_KINDS = [
  "IMAGE_GALLERY",
  "PLAN",
  "DOCUMENT",
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ALT_TEXT_LENGTH = 500;
export const DEFAULT_MEDIA_OWNER_TYPE = "PROMOCION" as const;
