import { eq } from "drizzle-orm";
import { contactConfig } from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactConfigResult {
  whatsappNumber: string | null;
  whatsappPrefilledMessage: string | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns WhatsApp configuration from contact_config for the current tenant.
 * Includes unstable_cache for Next.js ISR caching where available.
 */
export async function getContactConfig(): Promise<ContactConfigResult> {
  const ctx = new PublicContext();
  return getContactConfigService(ctx);
}

// ---------------------------------------------------------------------------
// Service (testable)
// ---------------------------------------------------------------------------

export async function getContactConfigService(
  ctx: TenantContext,
): Promise<ContactConfigResult> {
  return ctx.withTransaction(async (tx) => {
    const [config] = await tx
      .select({
        whatsappNumber: contactConfig.whatsappNumber,
        whatsappPrefilledMessage: contactConfig.whatsappPrefilledMessage,
      })
      .from(contactConfig)
      .where(eq(contactConfig.tenantId, ctx.getTenantId()))
      .limit(1);

    if (!config) {
      return {
        whatsappNumber: null,
        whatsappPrefilledMessage: null,
      };
    }

    return {
      whatsappNumber: config.whatsappNumber ?? null,
      whatsappPrefilledMessage: config.whatsappPrefilledMessage ?? null,
    };
  });
}
