import { z } from "zod";
import {
  PROMOCION_KINDS,
  PROMOCION_STATUSES,
  OPERATION_TYPES,
  PROPERTY_TYPES,
  CONSTRUCTION_STATUSES,
  MAP_PRIVACY_MODES,
} from "@/shared/constants/db-enums";
import { PROMOCION_NAME_MAX_LENGTH, SEO_TITLE_MAX_LENGTH, SEO_DESCRIPTION_MAX_LENGTH } from "@/shared/constants/domain-config";

/**
 * Schema Zod para validación de payloads de creación/edición de promoción.
 * Referencia los enums de `db-enums.ts` mediante `z.enum()` — no duplica valores.
 */
export const promocionSchema = z.object({
  name: z.string().min(1).max(PROMOCION_NAME_MAX_LENGTH),
  kind: z.enum(PROMOCION_KINDS),
  status: z.enum(PROMOCION_STATUSES),
  operation: z.enum(OPERATION_TYPES).nullable(),
  propertyType: z.enum(PROPERTY_TYPES).nullable(),
  constructionStatus: z.enum(CONSTRUCTION_STATUSES).nullable(),
  island: z.string().nullable(),
  municipality: z.string().nullable(),
  address: z.string().nullable(),
  mapPrivacyMode: z.enum(MAP_PRIVACY_MODES),
  seoTitle: z.string().max(SEO_TITLE_MAX_LENGTH).nullable(),
  seoDescription: z.string().max(SEO_DESCRIPTION_MAX_LENGTH).nullable(),
});

export type PromocionPayload = z.infer<typeof promocionSchema>;
