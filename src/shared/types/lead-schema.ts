import { z } from "zod";
import {
  LEAD_SOURCES,
  LEAD_CHANNELS,
} from "@/shared/constants/db-enums";
import {
  LEAD_NAME_MAX_LENGTH,
  LEAD_EMAIL_MAX_LENGTH,
  LEAD_MESSAGE_MAX_LENGTH,
} from "@/shared/constants/domain-config";

/**
 * Schema Zod para validación de payloads de lead (incluye consentimiento RGPD).
 * El consentimiento es obligatorio — sin él, el lead no se persiste.
 */
export const leadSchema = z.object({
  name: z.string().min(1).max(LEAD_NAME_MAX_LENGTH),
  email: z.string().email().max(LEAD_EMAIL_MAX_LENGTH),
  phone: z.string().nullable(),
  message: z.string().max(LEAD_MESSAGE_MAX_LENGTH).nullable(),
  source: z.enum(LEAD_SOURCES),
  channel: z.enum(LEAD_CHANNELS).nullable(),
  promocionId: z.string().uuid(),
  tipologiaId: z.string().uuid().nullable(),
  consent: z.object({
    legalBasis: z.string(),
    textAccepted: z.string(),
  }),
});

export type LeadPayload = z.infer<typeof leadSchema>;
