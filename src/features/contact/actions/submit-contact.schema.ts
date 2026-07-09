import { z } from "zod";

/**
 * Schema for the generic contact form submission.
 */
export const contactFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Email no válido")
    .max(255),
  message: z
    .string()
    .min(1, "El mensaje es obligatorio")
    .max(2000, "El mensaje no puede exceder 2000 caracteres"),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export interface ContactFormResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
