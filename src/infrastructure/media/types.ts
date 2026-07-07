export type MediaKind = "IMAGE_GALLERY" | "PLAN" | "DOCUMENT";

export interface UploadInput {
  file: Buffer;
  fileName: string;
  mimeType: string;
  altText: string;
  kind: MediaKind;
  ownerId: string;
}

export interface TransformOptions {
  width?: number;
  height?: number;
  format?: "webp" | "avif" | "jpeg" | "auto";
  quality?: number;
}

export class UploadValidationError extends Error {
  constructor(
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}
