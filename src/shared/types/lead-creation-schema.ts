import { z } from "zod";

// ---------------------------------------------------------------------------
// Lead creation schema with RGPD consent validation
// ---------------------------------------------------------------------------

/**
 * Schema Zod para la creacion de leads desde formulario publico o API
 * institucional. Incluye validacion de consentimiento RGPD.
 */
export const leadCreationSchema = z.object({
  // Lead fields
  promocionId: z.string().uuid("promocionId must be a valid UUID"),
  tipologiaId: z.string().uuid().optional(),
  source: z.enum(["commercial", "institutional"]),
  channel: z.enum(["FORM", "WHATSAPP"]).optional(),
  name: z.string().min(1, "name is required"),
  email: z.string().email("email must be valid"),
  phone: z.string().optional(),
  message: z.string().optional(),

  // Consent fields (RGPD)
  consentLegalBasis: z
    .string()
    .min(1, "consentLegalBasis is required"),
  consentTextAccepted: z
    .string()
    .min(1, "consentTextAccepted is required"),
});

export type LeadCreationInput = z.infer<typeof leadCreationSchema>;
