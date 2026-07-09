import { eq } from "drizzle-orm";
import { cache } from "react";
import { tenants, contactConfig } from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrganizationData {
  tenant: {
    name: string;
    config: Record<string, unknown> | null;
  } | null;
  contact: {
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Fetches organization data (tenant name + config, contact configuration)
 * for structured-data / JSON-LD generation.
 *
 * Uses a transaction with `SET LOCAL app.current_tenant_id` to ensure RLS
 * isolation for the given tenant context.
 *
 * @param ctx - Tenant context (defaults to PublicContext for public pages).
 */
export const getOrganizationData = cache(async (
  ctx: TenantContext = new PublicContext(),
): Promise<OrganizationData> => {
  return ctx.withTransaction(async (tx) => {
    const tenantId = ctx.getTenantId();

    const [tenantRows, contactCfgRows] = await Promise.all([
      tx
        .select({ name: tenants.name, config: tenants.config })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1),
      tx
        .select({
          phone: contactConfig.phone,
          email: contactConfig.email,
          address: contactConfig.address,
        })
        .from(contactConfig)
        .where(eq(contactConfig.tenantId, tenantId))
        .limit(1),
    ]);

    return {
      tenant: tenantRows[0] ?? null,
      contact: contactCfgRows[0] ?? null,
    };
  });
});
