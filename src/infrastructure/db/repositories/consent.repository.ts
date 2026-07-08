import { eq, and } from "drizzle-orm";
import { consentRecords } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsentRecordRow = typeof consentRecords.$inferSelect;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ConsentRepository extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext;

  constructor(ctx: AuthenticatedContext) {
    super(ctx);
    this.authCtx = ctx;
  }

  /**
   * Crea un registro de consentimiento RGPD para un lead.
   * Solo INSERT — consent_records es inmutable (politica RLS).
   */
  async create(
    leadId: string,
    legalBasis: string,
    textAccepted: string,
    ip?: string,
    userAgent?: string,
  ): Promise<ConsentRecordRow> {
    return this.withTransaction(async (tx) => {
      const [record] = await tx
        .insert(consentRecords)
        .values({
          tenantId: this.authCtx.getTenantId(),
          leadId,
          legalBasis,
          textAccepted,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
        })
        .returning();

      if (!record) {
        throw new Error("Failed to create consent record");
      }

      return record;
    });
  }

  /**
   * Retorna todos los registros de consentimiento para un lead.
   */
  async findByLeadId(leadId: string): Promise<ConsentRecordRow[]> {
    return this.withTransaction(async (tx) => {
      return tx
        .select()
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.leadId, leadId),
            eq(consentRecords.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .orderBy(consentRecords.createdAt);
    });
  }
}
