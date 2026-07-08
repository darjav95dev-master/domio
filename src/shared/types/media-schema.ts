import { z } from "zod";
import { MEDIA_ASSET_KINDS } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ALT_TEXT_MIN_LENGTH = 1;
export const ALT_TEXT_MAX_LENGTH = 500;

const INVALID_PROMOCION_ID_MSG = "ID de promoción inválido";
const INVALID_ASSET_ID_MSG = "ID de asset inválido";

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

/**
 * Validates alt_text: required, non-empty, max 500 characters.
 */
export const altTextSchema = z
  .string()
  .trim()
  .min(ALT_TEXT_MIN_LENGTH, "El texto alternativo es obligatorio")
  .max(
    ALT_TEXT_MAX_LENGTH,
    `El texto alternativo no puede exceder ${ALT_TEXT_MAX_LENGTH} caracteres`,
  );

/**
 * Validates media kind: must be one of IMAGE_GALLERY, PLAN, DOCUMENT.
 */
export const mediaKindSchema = z.enum(MEDIA_ASSET_KINDS);

// ---------------------------------------------------------------------------
// Action payload schemas
// ---------------------------------------------------------------------------

/**
 * Schema for media upload action payload.
 */
export const uploadMediaSchema = z.object({
  promocionId: z.string().uuid(INVALID_PROMOCION_ID_MSG),
  kind: mediaKindSchema,
  altText: altTextSchema,
});

/**
 * Schema for media delete action payload.
 */
export const deleteMediaSchema = z.object({
  promocionId: z.string().uuid(INVALID_PROMOCION_ID_MSG),
  assetId: z.string().uuid(INVALID_ASSET_ID_MSG),
});

/**
 * Schema for media reorder action payload.
 */
export const reorderMediaSchema = z.object({
  promocionId: z.string().uuid(INVALID_PROMOCION_ID_MSG),
  kind: mediaKindSchema,
  orderedAssetIds: z
    .array(z.string().uuid(INVALID_ASSET_ID_MSG))
    .min(1, "Debe incluir al menos un asset"),
});

/**
 * Schema for set-cover action payload.
 */
export const setCoverSchema = z.object({
  promocionId: z.string().uuid(INVALID_PROMOCION_ID_MSG),
  assetId: z.string().uuid(INVALID_ASSET_ID_MSG),
});
