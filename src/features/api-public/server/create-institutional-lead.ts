import { leads, consentRecords, emailQueue } from "@/infrastructure/db/schema";
import type { ApiKeyContext } from "@/infrastructure/tenant/ApiKeyContext";
import { leadInstitutionalSchema, type LeadInstitutionalInput } from "../schemas/lead-institutional.schema";
import { EMAIL_TEMPLATE_NAMES } from "@/shared/constants/email-templates";

export interface CreateInstitutionalLeadInput {
  ctx: ApiKeyContext;
  payload: LeadInstitutionalInput;
  ip?: string;
  userAgent?: string;
}

export interface CreateInstitutionalLeadResult {
  leadId: string;
  consentId: string;
  emailQueueId: string;
}

/**
 * Crea un lead institucional con consentimiento RGPD en una transacción atómica.
 *
 * 1. Valida el payload con leadInstitutionalSchema (Zod).
 * 2. Inserta el lead con source='institutional'.
 * 3. Crea el registro de consentimiento.
 * 4. Encola el email de notificación en email_queue (nunca se envía directamente).
 *
 * Todas las operaciones ocurren dentro de la misma transacción con SET LOCAL
 * para garantizar aislamiento multi-tenant y consistencia.
 */
export async function createInstitutionalLead(
  input: CreateInstitutionalLeadInput,
): Promise<CreateInstitutionalLeadResult> {
  const { ctx, payload, ip, userAgent } = input;

  // 1. Validate payload
  const parsed = leadInstitutionalSchema.safeParse(payload);

  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    const error = new Error("Validation failed") as Error & {
      details: Record<string, string[] | undefined>;
      statusCode: number;
    };
    error.details = details;
    error.statusCode = 422;
    throw error;
  }

  const data = parsed.data;

  // 2. Create lead + consent + email queue atomically within the same transaction
  return ctx.withTransaction(async (tx) => {
    // Insert lead
    const [lead] = await tx
      .insert(leads)
      .values({
        tenantId: ctx.getTenantId(),
        promocionId: data.promocionId,
        tipologiaId: data.tipologiaId ?? null,
        source: "institutional",
        channel: "FORM",
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message ?? null,
      })
      .returning();

    if (!lead) {
      throw new Error("Failed to create lead");
    }

    // Insert consent record
    const [consent] = await tx
      .insert(consentRecords)
      .values({
        tenantId: ctx.getTenantId(),
        leadId: lead.id,
        legalBasis: data.consent.legalBasis,
        textAccepted: data.consent.textAccepted,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      })
      .returning();

    if (!consent) {
      throw new Error("Failed to create consent record");
    }

    // Enqueue email notification in the same transaction
    const [email] = await tx
      .insert(emailQueue)
      .values({
        toEmail: data.email,
        template: EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION,
        payload: {
          leadName: data.name,
          promotionName: data.promocionId,
          contactEmail: data.email,
        },
      })
      .returning();

    if (!email) {
      throw new Error("Failed to enqueue email notification");
    }

    return {
      leadId: lead.id,
      consentId: consent.id,
      emailQueueId: email.id,
    };
  });
}
