import { eq, and, count, sql } from "drizzle-orm";
import {
  leads,
  leadReadMarks,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadReadMarkRow {
  tenantId: string;
  leadId: string;
  userId: string;
  readAt: Date;
}

// ---------------------------------------------------------------------------
// Read Mark Repository — extraída de LeadRepository (responsabilidad única:
// gestión de read marks para leads)
// ---------------------------------------------------------------------------

export class LeadReadMarkRepository extends TenantAwareRepository {
  constructor(ctx: TenantContext) {
    super(ctx);
  }

  // -----------------------------------------------------------------------
  // markAsRead — INSERT on conflict UPDATE (upsert by composite PK)
  // -----------------------------------------------------------------------

  async markAsRead(
    leadId: string,
    userId: string,
  ): Promise<LeadReadMarkRow> {
    return this.withTransaction(async (tx) => {
      const [mark] = await tx
        .insert(leadReadMarks)
        .values({
          tenantId: this.ctx.getTenantId(),
          leadId,
          userId,
          readAt: sql`now()`,
        })
        .onConflictDoUpdate({
          target: [leadReadMarks.leadId, leadReadMarks.userId],
          set: {
            readAt: sql`now()`,
          },
        })
        .returning();

      if (!mark) {
        throw new Error("Failed to mark lead as read");
      }

      return mark;
    });
  }

  // -----------------------------------------------------------------------
  // getUnreadCount — leads assigned to user without a read mark
  // -----------------------------------------------------------------------

  async getUnreadCount(userId: string): Promise<number> {
    return this.withTransaction(async (tx) => {
      const [result] = await tx
        .select({ count: count() })
        .from(leads)
        .leftJoin(
          leadReadMarks,
          and(
            eq(leads.id, leadReadMarks.leadId),
            eq(leadReadMarks.userId, userId),
          ),
        )
        .where(
          and(
            eq(leads.tenantId, this.ctx.getTenantId()),
            eq(leads.assignedAgentId, userId),
            sql`${leadReadMarks.leadId} IS NULL`,
          ),
        );

      return Number(result?.count ?? 0);
    });
  }

  // -----------------------------------------------------------------------
  // getUnreadLeadIds — IDs of leads not yet read by the user
  // -----------------------------------------------------------------------

  async getUnreadLeadIds(userId: string): Promise<string[]> {
    return this.withTransaction(async (tx) => {
      const rows = await tx
        .select({ id: leads.id })
        .from(leads)
        .leftJoin(
          leadReadMarks,
          and(
            eq(leads.id, leadReadMarks.leadId),
            eq(leadReadMarks.userId, userId),
          ),
        )
        .where(
          and(
            eq(leads.tenantId, this.ctx.getTenantId()),
            eq(leads.assignedAgentId, userId),
            sql`${leadReadMarks.leadId} IS NULL`,
          ),
        );

      return rows.map((r) => r.id);
    });
  }

  // -----------------------------------------------------------------------
  // isLeadReadByUser
  // -----------------------------------------------------------------------

  async isLeadReadByUser(
    leadId: string,
    userId: string,
  ): Promise<boolean> {
    return this.withTransaction(async (tx) => {
      const [mark] = await tx
        .select()
        .from(leadReadMarks)
        .where(
          and(
            eq(leadReadMarks.leadId, leadId),
            eq(leadReadMarks.userId, userId),
          ),
        )
        .limit(1);

      return mark !== undefined;
    });
  }
}
