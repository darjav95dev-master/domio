import { z } from "zod";
import { contactBaseSchema } from "@/shared/schemas/contact-base.schema";

/**
 * Schema for the generic contact form submission.
 * Extends the base contact schema — no additional fields needed.
 */
export const contactFormSchema = contactBaseSchema;

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export interface ContactFormResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
