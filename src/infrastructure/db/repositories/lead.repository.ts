import { eq, and, or, like, gte, lte, sql, count, desc } from "drizzle-orm";
import {
  leads,
  leadNotes,
  leadHistory,
  leadReadMarks,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { validateStatusTransition } from "@/shared/types/lead-schema";
import type { LeadStatus, UserRole } from "@/shared/constants/db-enums";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadFilters {
  status?: LeadStatus;
  source?: "commercial" | "institutional";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  promocionId?: string;
  assignedAgentId?: string;
}

export interface LeadPagination {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface LeadRow {
  id: string;
  tenantId: string;
  promocionId: string;
  tipologiaId: string | null;
  source: string;
  channel: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  assignedAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadNoteRow {
  id: string;
  tenantId: string;
  leadId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

export interface LeadHistoryRow {
  id: string;
  tenantId: string;
  leadId: string;
  fromStatus: string | null;
  toStatus: string;
  authorId: string;
  createdAt: Date;
}

export interface LeadReadMarkRow {
  tenantId: string;
  leadId: string;
  userId: string;
  readAt: Date;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class LeadRepository extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext;

  constructor(ctx: AuthenticatedContext) {
    super(ctx);
    this.authCtx = ctx;
  }

  /**
   * Build the base WHERE conditions common to all lead queries:
   * tenant isolation + AGENT scope filtering by assignedAgentId.
   */
  private buildBaseConditions(
    filters: LeadFilters,
  ): ReturnType<typeof eq>[] {
    const conditions: ReturnType<typeof eq>[] = [
      eq(leads.tenantId, this.authCtx.getTenantId()),
    ];

    // OPERATOR role is not allowed to access leads data
    if (this.authCtx.role === "OPERATOR") {
      throw new Error("Forbidden");
    }

    // AGENT role: always filter by assignedAgentId = current user
    if (this.authCtx.role === "AGENT") {
      conditions.push(eq(leads.assignedAgentId, this.authCtx.userId));
    } else if (filters.assignedAgentId) {
      // ADMIN/OPERATOR: use explicit filter if provided
      conditions.push(eq(leads.assignedAgentId, filters.assignedAgentId));
    }

    return conditions;
  }

  /**
   * Apply optional filters (status, source, search, date range, promocionId)
   * on top of the base conditions.
   */
  private applyOptionalFilters(
    conditions: ReturnType<typeof eq | typeof like | typeof gte | typeof lte>[],
    filters: LeadFilters,
  ): void {
    if (filters.status) {
      conditions.push(eq(leads.status, filters.status));
    }
    if (filters.source) {
      conditions.push(eq(leads.source, filters.source));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(like(leads.name, pattern), like(leads.email, pattern))!,
      );
    }
    if (filters.dateFrom) {
      conditions.push(gte(leads.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(leads.createdAt, new Date(filters.dateTo)));
    }
    if (filters.promocionId) {
      conditions.push(eq(leads.promocionId, filters.promocionId));
    }
  }

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  async findAll(
    filters: LeadFilters,
    pagination: LeadPagination,
  ): Promise<PaginatedResult<LeadRow>> {
    return this.withTransaction(async (tx) => {
      const conditions = this.buildBaseConditions(filters);
      this.applyOptionalFilters(conditions, filters);

      const whereClause = and(...conditions);
      const offset = (pagination.page - 1) * pagination.limit;

      const items = await tx
        .select()
        .from(leads)
        .where(whereClause)
        .orderBy(desc(leads.updatedAt))
        .limit(pagination.limit)
        .offset(offset);

      const totalResult = await tx
        .select({ count: count() })
        .from(leads)
        .where(whereClause);

      const total = Number(totalResult[0]?.count ?? 0);

      return { items, total };
    });
  }

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------

  async findById(id: string): Promise<LeadRow | null> {
    return this.withTransaction(async (tx) => {
      const [lead] = await tx
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.id, id),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        );

      return lead ?? null;
    });
  }

  // -----------------------------------------------------------------------
  // updateStatus — cambia estado + registra en lead_history (T006)
  // -----------------------------------------------------------------------

  async updateStatus(
    id: string,
    newStatus: LeadStatus,
    userId: string,
  ): Promise<LeadRow> {
    return this.withTransaction(async (tx) => {
      // 1. Fetch current lead
      const [current] = await tx
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.id, id),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        );

      if (!current) {
        throw new Error(`Lead with id ${id} not found`);
      }

      // 2. Validate state transition (T006)
      validateStatusTransition(
        current.status as LeadStatus,
        newStatus,
      );

      // 3. Update lead status
      const [updated] = await tx
        .update(leads)
        .set({
          status: newStatus,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(leads.id, id),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error(`Failed to update status for lead ${id}`);
      }

      // 4. Record history entry (immutable)
      await tx.insert(leadHistory).values({
        tenantId: this.authCtx.getTenantId(),
        leadId: id,
        fromStatus: current.status as LeadStatus,
        toStatus: newStatus,
        authorId: userId,
      });

      // 5. Re-fetch to return fresh data
      const [result] = await tx
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.id, id),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        );

      if (!result) {
        throw new Error(`Failed to fetch lead ${id} after status update`);
      }

      return result;
    });
  }

  // -----------------------------------------------------------------------
  // addNote
  // -----------------------------------------------------------------------

  async addNote(
    leadId: string,
    text: string,
    authorId: string,
  ): Promise<LeadNoteRow> {
    return this.withTransaction(async (tx) => {
      const [note] = await tx
        .insert(leadNotes)
        .values({
          tenantId: this.authCtx.getTenantId(),
          leadId,
          authorId,
          body: text,
        })
        .returning();

      if (!note) {
        throw new Error("Failed to add note to lead");
      }

      return note;
    });
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
          tenantId: this.authCtx.getTenantId(),
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
        .where(
          and(
            eq(leads.tenantId, this.authCtx.getTenantId()),
            eq(leads.assignedAgentId, userId),
            sql`${leads.id} NOT IN (
              SELECT ${leadReadMarks.leadId}
              FROM ${leadReadMarks}
              WHERE ${leadReadMarks.userId} = ${userId}
            )`,
          ),
        );

      return Number(result?.count ?? 0);
    });
  }

  // -----------------------------------------------------------------------
  // reassign — UPDATE + DELETE en misma transaccion (atomica)
  // -----------------------------------------------------------------------

  async reassign(
    leadId: string,
    newAgentId: string,
  ): Promise<LeadRow> {
    return this.withTransaction(async (tx) => {
      // 1. Update assigned agent
      const [updated] = await tx
        .update(leads)
        .set({
          assignedAgentId: newAgentId,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(leads.id, leadId),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error(`Lead with id ${leadId} not found`);
      }

      // 2. Delete all read marks for this lead (lead appears as unread for new agent)
      await tx
        .delete(leadReadMarks)
        .where(
          and(
            eq(leadReadMarks.leadId, leadId),
            eq(leadReadMarks.tenantId, this.authCtx.getTenantId()),
          ),
        );

      // 3. Re-fetch to return fresh data
      const [result] = await tx
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.id, leadId),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        );

      if (!result) {
        throw new Error(`Failed to fetch lead ${leadId} after reassign`);
      }

      return result;
    });
  }

  // -----------------------------------------------------------------------
  // exportCsv: scope by role - AGENT only assigned leads, ADMIN/OPERATOR all
  // -----------------------------------------------------------------------

  async exportCsv(
    filters: LeadFilters,
    userId: string,
    role: UserRole,
  ): Promise<LeadRow[]> {
    return this.withTransaction(async (tx) => {
      const conditions: ReturnType<typeof eq | typeof like | typeof gte | typeof lte>[] = [
        eq(leads.tenantId, this.authCtx.getTenantId()),
      ];

      // Scope by role: AGENT only their leads, ADMIN/OPERATOR all leads
      if (role === "AGENT") {
        conditions.push(eq(leads.assignedAgentId, userId));
      }

      this.applyOptionalFilters(conditions, filters);

      return tx
        .select()
        .from(leads)
        .where(and(...conditions))
        .orderBy(desc(leads.updatedAt));
    });
  }

  // -----------------------------------------------------------------------
  // getLeadHistory
  // -----------------------------------------------------------------------

  async getLeadHistory(
    leadId: string,
  ): Promise<LeadHistoryRow[]> {
    return this.withTransaction(async (tx) => {
      return tx
        .select()
        .from(leadHistory)
        .where(
          and(
            eq(leadHistory.leadId, leadId),
            eq(leadHistory.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .orderBy(desc(leadHistory.createdAt));
    });
  }

  // -----------------------------------------------------------------------
  // getNotes
  // -----------------------------------------------------------------------

  async getNotes(leadId: string): Promise<LeadNoteRow[]> {
    return this.withTransaction(async (tx) => {
      return tx
        .select()
        .from(leadNotes)
        .where(
          and(
            eq(leadNotes.leadId, leadId),
            eq(leadNotes.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .orderBy(desc(leadNotes.createdAt));
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
        .where(
          and(
            eq(leads.tenantId, this.authCtx.getTenantId()),
            eq(leads.assignedAgentId, userId),
            sql`${leads.id} NOT IN (
              SELECT ${leadReadMarks.leadId}
              FROM ${leadReadMarks}
              WHERE ${leadReadMarks.userId} = ${userId}
            )`,
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
