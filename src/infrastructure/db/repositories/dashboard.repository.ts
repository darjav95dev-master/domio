import { count, eq, and, inArray, isNull, desc } from "drizzle-orm";
import { leads, leadReadMarks, promociones } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { LeadStatus } from "@/shared/constants/db-enums";

export interface RecentPromocion {
  id: string;
  name: string;
  status: string;
  updatedAt: Date;
}

const UNREAD_LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "IN_NEGOTIATION",
];

export class DashboardRepository extends TenantAwareRepository {
  constructor(private readonly authCtx: AuthenticatedContext) {
    super(authCtx);
  }

  async getUnreadLeadsCount(): Promise<number> {
    return this.withTransaction(async (tx) => {
      const rows = await tx
        .select({ count: count() })
        .from(leads)
        .leftJoin(
          leadReadMarks,
          and(
            eq(leadReadMarks.leadId, leads.id),
            eq(leadReadMarks.userId, this.authCtx.userId),
          ),
        )
        .where(
          and(
            eq(leads.tenantId, this.authCtx.getTenantId()),
            this.authCtx.role === "AGENT"
              ? eq(leads.assignedAgentId, this.authCtx.userId)
              : undefined,
            inArray(leads.status, UNREAD_LEAD_STATUSES),
            isNull(leadReadMarks.userId),
          ),
        );

      const result = rows[0];
      return Number(result?.count ?? 0);
    });
  }

  async getRecentPromociones(limit: number = 5): Promise<RecentPromocion[]> {
    return this.withTransaction(async (tx) => {
      const rows = await tx
        .select({
          id: promociones.id,
          name: promociones.name,
          status: promociones.status,
          updatedAt: promociones.updatedAt,
        })
        .from(promociones)
        .where(
          and(
            eq(promociones.tenantId, this.authCtx.getTenantId()),
            this.authCtx.role === "AGENT"
              ? eq(promociones.assignedAgentId, this.authCtx.userId)
              : undefined,
          ),
        )
        .orderBy(desc(promociones.updatedAt))
        .limit(limit);

      return rows;
    });
  }
}
