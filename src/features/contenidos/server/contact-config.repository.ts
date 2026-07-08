import { eq, sql } from "drizzle-orm";
import { contactConfig as contactConfigTable } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";
import type { ContactConfig, NewContactConfig } from "@/infrastructure/db/schema/contact-config";

export interface ContactConfigUpdateData {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hours?: string | null;
  whatsappNumber?: string | null;
  whatsappPrefilledMessage?: string | null;
}

export class ContactConfigRepository extends TenantAwareRepository {
  constructor(ctx: TenantContext) {
    super(ctx);
  }

  /**
   * Returns the contact configuration for the given tenant.
   * Returns null if no config exists.
   */
  async findByTenant(tenantId: string): Promise<ContactConfig | null> {
    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(contactConfigTable)
        .where(eq(contactConfigTable.tenantId, tenantId))
        .limit(1);

      return row ?? null;
    });
  }

  /**
   * Creates or updates the contact configuration for the given tenant.
   *
   * Since tenant_id is the primary key, it uses ON CONFLICT to atomically
   * insert or update.
   */
  async upsert(
    tenantId: string,
    data: ContactConfigUpdateData,
    userId: string,
  ): Promise<ContactConfig> {
    return this.withTransaction(async (tx) => {
      const now = sql`now()`;

      const [row] = await tx
        .insert(contactConfigTable)
        .values({
          tenantId,
          ...data,
          updatedBy: userId,
        } satisfies NewContactConfig)
        .onConflictDoUpdate({
          target: contactConfigTable.tenantId,
          set: {
            ...data,
            updatedBy: userId,
            updatedAt: now,
          },
        })
        .returning();

      if (!row) {
        throw new Error("Failed to upsert contact config");
      }

      return row;
    });
  }
}
