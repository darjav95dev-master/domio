import { eq, and, sql } from "drizzle-orm";
import { contentBlocks } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";
import type { ContentBlock, NewContentBlock } from "@/infrastructure/db/schema/content-blocks";
import type { PageKey, BlockKey } from "@/shared/types/content.types";

export class ContentBlockRepository extends TenantAwareRepository {
  constructor(ctx: TenantContext) {
    super(ctx);
  }

  /**
   * Returns all content blocks for the given tenant and page key.
   */
  async findByTenantAndPage(
    tenantId: string,
    pageKey: PageKey,
  ): Promise<ContentBlock[]> {
    return this.withTransaction(async (tx) => {
      return tx
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.tenantId, tenantId),
            eq(contentBlocks.pageKey, pageKey),
          ),
        );
    });
  }

  /**
   * Returns a specific content block for the given tenant, page, and block key.
   * Returns null if not found.
   */
  async findByTenantPageAndBlock(
    tenantId: string,
    pageKey: PageKey,
    blockKey: BlockKey,
  ): Promise<ContentBlock | null> {
    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.tenantId, tenantId),
            eq(contentBlocks.pageKey, pageKey),
            eq(contentBlocks.blockKey, blockKey),
          ),
        )
        .limit(1);

      return row ?? null;
    });
  }

  /**
   * Creates or updates a content block.
   *
   * - If a block with the same (tenant_id, page_key, block_key) exists,
   *   updates its payload and updated_by.
   * - Otherwise, creates a new block.
   */
  async upsert(
    tenantId: string,
    pageKey: PageKey,
    blockKey: BlockKey,
    payload: Record<string, unknown>,
    userId: string,
  ): Promise<ContentBlock> {
    return this.withTransaction(async (tx) => {
      // Try to find existing block
      const [existing] = await tx
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.tenantId, tenantId),
            eq(contentBlocks.pageKey, pageKey),
            eq(contentBlocks.blockKey, blockKey),
          ),
        )
        .limit(1);

      if (existing) {
        // Update existing block
        const [updated] = await tx
          .update(contentBlocks)
          .set({
            payload,
            updatedBy: userId,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(contentBlocks.id, existing.id),
              eq(contentBlocks.tenantId, tenantId),
            ),
          )
          .returning();

        if (!updated) {
          throw new Error("Failed to update content block");
        }

        return updated;
      }

      // Create new block
      const [created] = await tx
        .insert(contentBlocks)
        .values({
          tenantId,
          pageKey,
          blockKey,
          payload,
          updatedBy: userId,
        } satisfies NewContentBlock)
        .returning();

      if (!created) {
        throw new Error("Failed to create content block");
      }

      return created;
    });
  }
}
