import { z } from "zod";
import { contactBaseSchema } from "@/shared/schemas/contact-base.schema";

/**
 * Shared Zod schema for the commercial contact form (engagement with a promotion).
 * Extends the base contact schema with promotion-specific fields.
 * Validates on both client and server (same schema).
 */
export const contactFormSchema = contactBaseSchema.extend({
  phone: z
    .string()
    .regex(
      /^\+?[\d\s.-]{6,20}$/u,
      "Introduce un teléfono válido",
    )
    .optional()
    .or(z.literal("")),
  tipologiaId: z
    .string()
    .uuid("Identificador de tipología no válido")
    .optional(),
  consent: z
    .literal(true, {
      message: "Debes aceptar la política de privacidad",
    }),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
