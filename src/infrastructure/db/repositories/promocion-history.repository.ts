import { and, desc, eq } from "drizzle-orm";
import { promocionHistory, users } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoryEntryWithAuthor {
  id: string;
  tenantId: string;
  promocionId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  authorId: string;
  createdAt: Date;
  authorName: string | null;
}

// ---------------------------------------------------------------------------
// PromocionHistoryRepository
// ---------------------------------------------------------------------------

/**
 * Repository for audit history operations on promociones.
 *
 * Tracks field-level changes and provides history retrieval with
 * author names.
 */
export class PromocionHistoryRepository extends TenantAwareRepository {
  constructor(ctx: TenantContext) {
    super(ctx);
  }

  /**
   * Returns the audit history for a promoción, including author names,
   * sorted by createdAt DESC (most recent first).
   */
  async getHistory(
    promocionId: string,
  ): Promise<HistoryEntryWithAuthor[]> {
    return this.withTransaction(async (tx) => {
      const rows = await tx
        .select({
          id: promocionHistory.id,
          tenantId: promocionHistory.tenantId,
          promocionId: promocionHistory.promocionId,
          field: promocionHistory.field,
          oldValue: promocionHistory.oldValue,
          newValue: promocionHistory.newValue,
          authorId: promocionHistory.authorId,
          createdAt: promocionHistory.createdAt,
          authorName: users.name,
        })
        .from(promocionHistory)
        .leftJoin(users, eq(promocionHistory.authorId, users.id))
        .where(
          and(
            eq(promocionHistory.promocionId, promocionId),
            eq(promocionHistory.tenantId, this.ctx.getTenantId()),
          ),
        )
        .orderBy(desc(promocionHistory.createdAt));

      return rows;
    });
  }

  /**
   * Records field-level changes for an update operation.
   * Compares old and new values and inserts a history row for each changed field.
   */
  async recordFieldChanges(
    tx: Transaction,
    promocionId: string,
    current: Record<string, unknown>,
    fieldsToCompare: Array<{ key: string; fieldName: string }>,
    data: Record<string, unknown>,
    updateData: Record<string, unknown>,
    authorId: string,
  ): Promise<void> {
    for (const { key, fieldName } of fieldsToCompare) {
      if (!(key in data)) continue;

      const oldVal = current[fieldName];
      const newVal = updateData[fieldName];

      const oldJson =
        oldVal !== undefined && oldVal !== null
          ? JSON.stringify(oldVal)
          : null;
      const newJson =
        newVal !== undefined && newVal !== null
          ? JSON.stringify(newVal)
          : null;

      if (oldJson !== newJson) {
        await tx.insert(promocionHistory).values({
          tenantId: this.ctx.getTenantId(),
          promocionId,
          field: fieldName,
          oldValue: oldJson,
          newValue: newJson,
          authorId,
        });
      }
    }
  }
}
