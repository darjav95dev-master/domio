import { z } from "zod";

/**
 * Schema Zod para la creacion de un lead institucional via API pública v1.
 *
 * El consentimiento (legal_basis + text_accepted) es obligatorio.
 * Sin consentimiento, el endpoint retorna 422.
 * source y channel los asigna el servidor internamente (no vienen del payload).
 */
export const leadInstitutionalSchema = z.object({
  name: z
    .string()
    .min(1, "name is required"),
  email: z
    .string()
    .email("email must be a valid email address"),
  phone: z
    .string()
    .optional(),
  message: z
    .string()
    .optional(),
  promocionId: z
    .string()
    .uuid("promocionId must be a valid UUID"),
  tipologiaId: z
    .string()
    .uuid()
    .optional(),
  consent: z.object({
    legalBasis: z
      .string()
      .min(1, "legalBasis is required"),
    textAccepted: z
      .string()
      .min(1, "textAccepted is required"),
  }),
});

export type LeadInstitutionalInput = z.infer<typeof leadInstitutionalSchema>;
