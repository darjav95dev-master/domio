import { eq, and, inArray } from "drizzle-orm";
import {
  promociones,
  tipologias,
  unidades,
  promocionContentBlocks,
  mediaAssets,
  users,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";
import {
  PROMOCION_SELECT_COLUMNS,
  type PromocionDetail,
  type TipologiaWithUnidades,
} from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * Responsible for assembling the full public detail of a promoción.
 *
 * Separated from PromocionRepository (SRP) so that CRUD, cursor pagination,
 * and detail assembly each have a single reason to change.
 */
export class PromocionDetailRepository extends TenantAwareRepository {
  constructor(ctx: TenantContext) {
    super(ctx);
  }
  /**
   * Returns the full detail of a promoción by slug, including tipologías,
   * content blocks and media assets, fetching all relations in parallel.
   * Returns null if the slug does not exist for the current tenant.
   */
  async findDetailBySlug(slug: string): Promise<PromocionDetail | null> {
    return this.withTransaction(async (tx) => {
      const [promocion] = await tx
        .select(PROMOCION_SELECT_COLUMNS)
        .from(promociones)
        .leftJoin(users, eq(promociones.assignedAgentId, users.id))
        .where(
          and(
            eq(promociones.slug, slug),
            eq(promociones.tenantId, this.ctx.getTenantId()),
          ),
        );

      if (!promocion) return null;

      // Parallelize independent queries for better performance
      const [tipologiasWithUnidades, contentBlocks, assets] = await Promise.all([
        this.assembleTipologias(tx, promocion.id),
        tx
          .select()
          .from(promocionContentBlocks)
          .where(
            and(
              eq(promocionContentBlocks.promocionId, promocion.id),
              eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
            ),
          )
          .orderBy(promocionContentBlocks.sortOrder),
        tx
          .select()
          .from(mediaAssets)
          .where(
            and(
              eq(mediaAssets.ownerId, promocion.id),
              eq(mediaAssets.ownerType, "PROMOCION"),
              eq(mediaAssets.tenantId, this.ctx.getTenantId()),
            ),
          )
          .orderBy(mediaAssets.sortOrder),
      ]);

      return {
        ...promocion,
        assignedAgentName: promocion.assignedAgentName ?? null,
        tipologias: tipologiasWithUnidades,
        contentBlocks,
        mediaAssets: assets,
      };
    });
  }

  private async assembleTipologias(
    tx: Transaction,
    promocionId: string,
  ): Promise<TipologiaWithUnidades[]> {
    const tipologiaRows = await tx
      .select()
      .from(tipologias)
      .where(
        and(
          eq(tipologias.promocionId, promocionId),
          eq(tipologias.tenantId, this.ctx.getTenantId()),
        ),
      );

    const tipologiaIds = tipologiaRows.map((t) => t.id);
    if (tipologiaIds.length === 0) return [];

    const unidadRows = await tx
      .select()
      .from(unidades)
      .where(
        and(
          inArray(unidades.tipologiaId, tipologiaIds),
          eq(unidades.tenantId, this.ctx.getTenantId()),
        ),
      );

    const unidadesByTipologiaId = new Map<string, Array<{
      id: string;
      tenantId: string;
      tipologiaId: string;
      identifier: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>>();
    for (const u of unidadRows) {
      const list = unidadesByTipologiaId.get(u.tipologiaId) ?? [];
      list.push(u);
      unidadesByTipologiaId.set(u.tipologiaId, list);
    }

    return tipologiaRows.map((t) => ({
      ...t,
      amenities: t.amenities ?? [],
      unidades: unidadesByTipologiaId.get(t.id) ?? [],
    }));
  }
}
