import { and, eq, inArray, sql } from "drizzle-orm";
import {
  promociones,
  promocionContentBlocks,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { contentBlockSchema } from "@/shared/types/content-block-schema";
import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";
import type { ContentBlockType } from "@/shared/constants/db-enums";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// PromocionContentBlockRepository
// ---------------------------------------------------------------------------

/**
 * Repository for content block operations on promociones.
 *
 * Encapsulates CRUD, reordering, and validation of editorial content blocks
 * (ZONAS_COMUNES, PLAZOS_GARANTIAS, UBICACION, DESCRIPCION, etc.).
 */
export class PromocionContentBlockRepository extends TenantAwareRepository {
  constructor(ctx: TenantContext) {
    super(ctx);
  }

  /**
   * Finds a single content block by promocionId and blockType.
   * Returns the parsed payload, or null if the block does not exist.
   */
  async findContentBlock(
    promocionId: string,
    blockType: ContentBlockType,
  ): Promise<Record<string, unknown> | null> {
    return this.withTransaction(async (tx) => {
      const [block] = await tx
        .select()
        .from(promocionContentBlocks)
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.blockType, blockType),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
          ),
        )
        .limit(1);

      if (!block) return null;
      return (block.payload ?? null) as Record<string, unknown> | null;
    });
  }

  /**
   * Returns all content blocks for a promotion, ordered by sort_order ascending.
   */
  async findAllContentBlocks(
    promocionId: string,
  ): Promise<PromocionContentBlock[]> {
    return this.withTransaction(async (tx) => {
      return tx
        .select()
        .from(promocionContentBlocks)
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
          ),
        )
        .orderBy(promocionContentBlocks.sortOrder);
    });
  }

  /**
   * Creates or updates a content block for the given promotion.
   *
   * - Validates kind constraint: ZONAS_COMUNES and PLAZOS_GARANTIAS are
   *   rejected for kind='external' BEFORE the INSERT (the SQL trigger is
   *   the last line of defense).
   * - If a block with the same block_type already exists, updates its payload.
   * - Otherwise, creates a new block with the next available sort_order.
   */
  async upsertContentBlock(
    promocionId: string,
    blockType: ContentBlockType,
    payload: Record<string, unknown>,
    userId: string,
  ): Promise<PromocionContentBlock> {
    return this.withTransaction(async (tx) => {
      // 1. Validate kind constraint: reject restricted block types for external promos
      const [promo] = await tx
        .select({ kind: promociones.kind })
        .from(promociones)
        .where(
          and(
            eq(promociones.id, promocionId),
            eq(promociones.tenantId, this.ctx.getTenantId()),
          ),
        );

      if (!promo) {
        throw new Error(`Promoción with id ${promocionId} not found`);
      }

      if (
        promo.kind === "external" &&
        (blockType === "ZONAS_COMUNES" || blockType === "PLAZOS_GARANTIAS")
      ) {
        throw new Error(
          `Blocks of type ${blockType} are not allowed for external promotions`,
        );
      }

      // 2. Check if a block with this block_type already exists
      const [existing] = await tx
        .select()
        .from(promocionContentBlocks)
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.blockType, blockType),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
          ),
        )
        .limit(1);

      if (existing) {
        // Update existing block
        const [updated] = await tx
          .update(promocionContentBlocks)
          .set({
            payload,
            updatedBy: userId,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(promocionContentBlocks.id, existing.id),
              eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
            ),
          )
          .returning();

        if (!updated) {
          throw new Error("Failed to update content block");
        }

        return updated;
      }

      // 3. Calculate next sort_order
      const [maxOrder] = await tx
        .select({ maxSort: sql<number>`COALESCE(MAX(sort_order), -1) + 1` })
        .from(promocionContentBlocks)
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
          ),
        );

      const nextSortOrder = maxOrder?.maxSort ?? 0;

      // 4. Create new block
      const [created] = await tx
        .insert(promocionContentBlocks)
        .values({
          tenantId: this.ctx.getTenantId(),
          promocionId,
          blockType,
          payload,
          sortOrder: nextSortOrder,
          updatedBy: userId,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create content block");
      }

      return created;
    });
  }

  /**
   * Deletes a content block and reindexes the sort_order of remaining blocks.
   */
  async deleteContentBlock(
    promocionId: string,
    blockId: string,
  ): Promise<void> {
    return this.withTransaction(async (tx) => {
      // 1. Delete the block
      await tx
        .delete(promocionContentBlocks)
        .where(
          and(
            eq(promocionContentBlocks.id, blockId),
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
          ),
        );

      // 2. Reindex sort_order of remaining blocks with a single batch UPDATE
      const remaining = await tx
        .select({ id: promocionContentBlocks.id })
        .from(promocionContentBlocks)
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
          ),
        )
        .orderBy(promocionContentBlocks.sortOrder);

      if (remaining.length === 0) return;

      const remainingIds = remaining.map((r) => r.id);
      const caseExpr = sql`(CASE ${promocionContentBlocks.id}
        ${sql.join(
          remainingIds.map((id, i) => sql`WHEN ${id} THEN ${i}`),
          sql` `,
        )}
        END)::integer`;

      await tx
        .update(promocionContentBlocks)
        .set({ sortOrder: caseExpr })
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
            inArray(promocionContentBlocks.id, remainingIds),
          ),
        );
    });
  }

  /**
   * Reorders content blocks atomically by setting sort_order based on the
   * position of each block ID in the provided array.
   */
  async reorderContentBlocks(
    promocionId: string,
    orderedBlockIds: string[],
  ): Promise<void> {
    return this.withTransaction(async (tx) => {
      if (orderedBlockIds.length === 0) return;

      const caseExpr = sql`(CASE ${promocionContentBlocks.id}
        ${sql.join(
          orderedBlockIds.map((id, i) => sql`WHEN ${id} THEN ${i}`),
          sql` `,
        )}
        END)::integer`;

      await tx
        .update(promocionContentBlocks)
        .set({ sortOrder: caseExpr })
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
            inArray(promocionContentBlocks.id, orderedBlockIds),
          ),
        );
    });
  }

  /**
   * Validates all content blocks for a promotion against their respective Zod schemas.
   * Used to block publishing if any block has invalid payload data.
   */
  async validateBlocksForPublish(
    promocionId: string,
  ): Promise<{
    valid: boolean;
    errors: Array<{ blockId: string; blockType: string; issues: string[] }>;
  }> {
    return this.withTransaction(async (tx) => {
      const blocks = await tx
        .select()
        .from(promocionContentBlocks)
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocionId),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
          ),
        );

      const errors: Array<{
        blockId: string;
        blockType: string;
        issues: string[];
      }> = [];

      for (const block of blocks) {
        const result = contentBlockSchema.safeParse({
          blockType: block.blockType,
          payload: block.payload ?? {},
        });

        if (!result.success) {
          errors.push({
            blockId: block.id,
            blockType: block.blockType,
            issues: result.error.issues.map(
              (issue) => `${issue.path.join(".")}: ${issue.message}`,
            ),
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    });
  }
}
