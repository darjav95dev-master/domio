import { z } from "zod";

// ─── Template names ────────────────────────────────────────────────
export const EMAIL_TEMPLATE_NAMES = {
  LEAD_ASSIGNED_AGENT: "lead-assigned-agent",
  LEAD_CONFIRMATION: "lead-confirmation",
  TEAM_INVITATION: "team-invitation",
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- false positive: "password-recovery" is a template name for the password recovery email, not a credential or secret
  PASSWORD_RECOVERY: "password-recovery",
  CONTACT_FORM_NOTIFICATION: "contact-form-notification",
  CONTACT_FORM_CONFIRMATION: "contact-form-confirmation",
} as const;

export type EmailTemplateName =
  (typeof EMAIL_TEMPLATE_NAMES)[keyof typeof EMAIL_TEMPLATE_NAMES];

// ─── Payload schemas ────────────────────────────────────────────────
export const leadAssignedAgentSchema = z.object({
  agentName: z.string().min(1),
  leadName: z.string().min(1),
  promotionName: z.string().min(1),
  backofficeUrl: z.string().url(),
});

export const leadConfirmationSchema = z.object({
  leadName: z.string().min(1),
  promotionName: z.string().min(1),
  contactEmail: z.string().email(),
});

export const teamInvitationSchema = z.object({
  inviteeName: z.string().min(1),
  role: z.string().min(1),
  setupPasswordUrl: z.string().url(),
});

export const passwordRecoverySchema = z.object({
  userName: z.string().min(1),
  resetUrl: z.string().url(),
  expiryMinutes: z.number().positive(),
});

export const contactFormNotificationSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(30).optional(),
  message: z.string().min(1).max(2000),
});

// Confirmación que recibe quien rellena el formulario general (no hay promoción,
// a diferencia de leadConfirmation). contactEmail es la dirección a la que puede
// escribir (la configurada en contact_config).
export const contactFormConfirmationSchema = z.object({
  name: z.string().min(1).max(100),
  contactEmail: z.string().email().max(255),
});

// ─── Schema registry ─────────────────────────────────────────────────
export const emailTemplatePayloadSchemas = {
  [EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT]: leadAssignedAgentSchema,
  [EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION]: leadConfirmationSchema,
  [EMAIL_TEMPLATE_NAMES.TEAM_INVITATION]: teamInvitationSchema,
  [EMAIL_TEMPLATE_NAMES.PASSWORD_RECOVERY]: passwordRecoverySchema,
  [EMAIL_TEMPLATE_NAMES.CONTACT_FORM_NOTIFICATION]: contactFormNotificationSchema,
  [EMAIL_TEMPLATE_NAMES.CONTACT_FORM_CONFIRMATION]: contactFormConfirmationSchema,
} as const;
