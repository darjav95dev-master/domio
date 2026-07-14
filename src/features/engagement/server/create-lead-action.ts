"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import {
  promociones,
  users,
  leads,
  consentRecords,
} from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import { contactFormSchema } from "../schemas/contact-form.schema";
import { checkIpRateLimit } from "@/infrastructure/rate-limiting/ip-rate-limit";
import { EMAIL_TEMPLATE_NAMES } from "@/shared/constants/email-templates";
import { backofficeLeadUrl } from "@/shared/constants/tenant-hosts";
import { verifyTurnstileToken } from "@/shared/utils/turnstile";
import { RGPD_CONSENT_TEXT_LEAD } from "@/shared/constants/consent-texts";
import { EmailRepository } from "@/infrastructure/email/email.repository";
import { EmailService } from "@/infrastructure/email/email.service";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";
import type { ContactFormInput } from "../schemas/contact-form.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

/** Input required by the action: form fields + contextual promocionId */
export interface CreateLeadInput extends ContactFormInput {
  promocionId: string;
  /** Cloudflare Turnstile token for bot protection. */
  turnstileToken?: string;
}

const promocionIdSchema = z.string().uuid("Identificador de promoción no válido");



// ---------------------------------------------------------------------------
// Server Action (entry point)
// ---------------------------------------------------------------------------

export async function createLeadAction(
  input: CreateLeadInput,
): Promise<ActionResult> {
  // 1. Verify Turnstile CAPTCHA
  const turnstileResult = await verifyTurnstileToken(input.turnstileToken);
  if (!turnstileResult.success) {
    return {
      success: false,
      error: turnstileResult.error ?? "Error de verificación de seguridad.",
    };
  }

  // 2. Validate form fields with shared Zod schema
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // 3. Validate promocionId separately (contextual, not a user field)
  const promocionIdResult = promocionIdSchema.safeParse(input.promocionId);
  if (!promocionIdResult.success) {
    return {
      success: false,
      error: "Promoción no válida",
    };
  }

  // 4. Rate limiting by IP
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? headersList.get("x-real-ip")
    ?? "unknown";

  const rateResult = await checkIpRateLimit(ip, "contact");
  if (!rateResult.allowed) {
    return {
      success: false,
      error: "Demasiados intentos. Intenta de nuevo más tarde.",
    };
  }

  // 5. Extract user-agent for RGPD consent traceability
  const userAgent = headersList.get("user-agent") ?? null;

  // 6. Execute business logic
  const ctx = new PublicContext();
  return createLeadService(ctx, parsed.data, promocionIdResult.data, ip, userAgent);
}

// ---------------------------------------------------------------------------
// Service (testable, exported for unit tests)
// ---------------------------------------------------------------------------

export async function createLeadService(
  ctx: TenantContext,
  data: ContactFormInput,
  promocionId: string,
  ip: string,
  userAgent: string | null = null,
): Promise<ActionResult> {
  const emailService = new EmailService(new EmailRepository());

  return ctx.withTransaction(async (tx) => {
    // 1. Fetch promocion to get name and assigned agent
    const [promocion] = await tx
      .select({
        id: promociones.id,
        name: promociones.name,
        assignedAgentId: promociones.assignedAgentId,
      })
      .from(promociones)
      .where(
        and(
          eq(promociones.id, promocionId),
          eq(promociones.tenantId, ctx.getTenantId()),
        ),
      )
      .limit(1);

    if (!promocion) {
      return { success: false, error: "Promoción no encontrada" };
    }

    if (!promocion.assignedAgentId) {
      return {
        success: false,
        error: "La promoción no tiene un agente asignado",
      };
    }

    // 2. Fetch agent info for notification email
    const [agent] = await tx
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, promocion.assignedAgentId))
      .limit(1);

    if (!agent) {
      return { success: false, error: "Agente no encontrado" };
    }

    // 3. Create lead
    const [lead] = await tx
      .insert(leads)
      .values({
        tenantId: ctx.getTenantId(),
        promocionId,
        tipologiaId: data.tipologiaId ?? null,
        source: "commercial",
        channel: "FORM",
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message,
        assignedAgentId: promocion.assignedAgentId,
        status: "NEW",
      })
      .returning();

    if (!lead) {
      return { success: false, error: "Error al crear el lead" };
    }

    // 4. Create consent record (immutable by RLS policy)
    await tx.insert(consentRecords).values({
      tenantId: ctx.getTenantId(),
      leadId: lead.id,
      legalBasis: "RGPD: consentimiento explícito del interesado",
      textAccepted: RGPD_CONSENT_TEXT_LEAD,
      ip,
      userAgent,
    });

    // 5. Enqueue confirmation email to the lead
    await emailService.enqueue(
      {
        toEmail: data.email,
        template: EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION,
        payload: {
          leadName: data.name,
          promotionName: promocion.name,
          contactEmail: agent.email,
        },
      },
      tx,
    );

    // 6. Enqueue notification email to the assigned agent
    await emailService.enqueue(
      {
        toEmail: agent.email,
        template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
        payload: {
          agentName: agent.name,
          leadName: data.name,
          promotionName: promocion.name,
          backofficeUrl: backofficeLeadUrl(lead.id),
        },
      },
      tx,
    );

    return {
      success: true,
      message:
        "Solicitud recibida. Nuestro equipo te contactará en 24-48h.",
    };
  });
}
