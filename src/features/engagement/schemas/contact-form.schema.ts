import { z } from "zod";

/**
 * Shared Zod schema for the contact form.
 * Validates on both client and server (same schema).
 */
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z
    .string()
    .email("Introduce un email válido"),
  phone: z
    .string()
    .regex(
      /^\+?[\d\s.-]{6,20}$/u,
      "Introduce un teléfono válido",
    )
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .min(10, "El mensaje debe tener al menos 10 caracteres"),
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
