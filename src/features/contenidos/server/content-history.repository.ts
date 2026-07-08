import { eq, and, desc } from "drizzle-orm";
import { contentHistory, users } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";
import type { ContentHistory, NewContentHistory } from "@/infrastructure/db/schema/content-history";
import type { ContentType } from "@/shared/types/content.types";

export class ContentHistoryRepository extends TenantAwareRepository {
  constructor(ctx: TenantContext) {
    super(ctx);
  }

  /**
   * Returns history entries for the given content type and key,
   * ordered by created_at DESC (most recent first).
   *
   * @param limit - Maximum number of entries to return (optional)
   */
  async findByContent(
    tenantId: string,
    contentType: ContentType,
    contentKey: string,
    limit?: number,
  ): Promise<ContentHistory[]> {
    return this.withTransaction(async (tx) => {
      const query = tx
        .select()
        .from(contentHistory)
        .where(
          and(
            eq(contentHistory.tenantId, tenantId),
            eq(contentHistory.contentType, contentType),
            eq(contentHistory.contentKey, contentKey),
          ),
        )
        .orderBy(desc(contentHistory.createdAt));

      if (limit !== undefined) {
        query.limit(limit);
      }

      return query;
    });
  }

  /**
   * Returns history entries enriched with the user's display name,
   * via a LEFT JOIN on content_history.updated_by → users.id.
   *
   * Each entry carries:
   * - updatedBy:      the UUID of the user (string | null)
   * - updatedByName:  the user's name (string | null — null when user deleted
   *                   or no user references the entry)
   */
  async findByContentWithUser(
    tenantId: string,
    contentType: ContentType,
    contentKey: string,
    limit?: number,
  ): Promise<Array<Omit<ContentHistory, "updatedBy"> & { updatedBy: string | null; updatedByName: string | null }>> {
    return this.withTransaction(async (tx) => {
      const query = tx
        .select({
          id: contentHistory.id,
          tenantId: contentHistory.tenantId,
          contentType: contentHistory.contentType,
          contentKey: contentHistory.contentKey,
          payloadSnapshot: contentHistory.payloadSnapshot,
          updatedBy: contentHistory.updatedBy,
          updatedByName: users.name,
          createdAt: contentHistory.createdAt,
        })
        .from(contentHistory)
        .leftJoin(users, eq(contentHistory.updatedBy, users.id))
        .where(
          and(
            eq(contentHistory.tenantId, tenantId),
            eq(contentHistory.contentType, contentType),
            eq(contentHistory.contentKey, contentKey),
          ),
        )
        .orderBy(desc(contentHistory.createdAt));

      if (limit !== undefined) {
        query.limit(limit);
      }

      return query;
    });
  }

  /**
   * Creates a new history entry (append-only).
   */
  async create(
    tenantId: string,
    contentType: ContentType,
    contentKey: string,
    payloadSnapshot: Record<string, unknown>,
    userId: string,
  ): Promise<ContentHistory> {
    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .insert(contentHistory)
        .values({
          tenantId,
          contentType,
          contentKey,
          payloadSnapshot,
          updatedBy: userId,
        } satisfies NewContentHistory)
        .returning();

      if (!row) {
        throw new Error("Failed to create history entry");
      }

      return row;
    });
  }

  /**
   * Returns a specific history entry by ID.
   * Returns null if not found.
   */
  async findById(
    tenantId: string,
    id: string,
  ): Promise<ContentHistory | null> {
    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(contentHistory)
        .where(
          and(
            eq(contentHistory.tenantId, tenantId),
            eq(contentHistory.id, id),
          ),
        )
        .limit(1);

      return row ?? null;
    });
  }
}
