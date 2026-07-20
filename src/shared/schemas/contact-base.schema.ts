import { z } from "zod";

/**
 * Base schema for contact form fields shared across features.
 *
 * Both the commercial engagement form and the generic contact form extend
 * this schema with their own specific fields. This ensures consistent
 * validation rules for common fields (name, email, message) across the
 * entire application.
 */
export const contactBaseSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  email: z
    .string()
    .email("Introduce un email válido")
    .max(255, "El email no puede exceder 255 caracteres"),
  phone: z
    .string()
    .max(30, "El teléfono no puede exceder 30 caracteres")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(2000, "El mensaje no puede exceder 2000 caracteres"),
});

export type ContactBaseInput = z.infer<typeof contactBaseSchema>;
