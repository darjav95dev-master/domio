import { z } from "zod";
import { ARSOP_REQUEST_TYPES } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Consent record schema
// ---------------------------------------------------------------------------

/**
 * Schema Zod para validacion de consentimiento RGPD.
 * - legalBasis: texto no vacio (ej: "RGPD consent")
 * - textAccepted: texto no vacio (ej: "He leido y acepto la politica...")
 * - ip: opcional, string
 * - userAgent: opcional, string
 */
export const consentSchema = z.object({
  legalBasis: z.string().min(1, "legalBasis is required"),
  textAccepted: z.string().min(1, "textAccepted is required"),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export type ConsentInput = z.infer<typeof consentSchema>;

// ---------------------------------------------------------------------------
// ARSOP request type schema
// ---------------------------------------------------------------------------

/**
 * Schema Zod para el tipo de solicitud ARSOP.
 * Solo acepta 'EXPORT' o 'DELETE'.
 */
export const arsopRequestTypeSchema = z.enum(ARSOP_REQUEST_TYPES);

export type ArsopRequestType = z.infer<typeof arsopRequestTypeSchema>;
