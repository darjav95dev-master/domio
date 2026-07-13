import { eq, and, inArray } from "drizzle-orm";
import {
  promociones,
  tipologias,
  unidades,
  users,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";
import type { MediaAsset } from "@/infrastructure/db/schema/media-assets";
import { TipologiaSyncService } from "@/infrastructure/db/services/tipologia-sync.service";
import { PromocionHistoryRecorder } from "@/infrastructure/db/repositories/promocion-history-recorder";
import { PROMOCION_SELECT_COLUMNS } from "@/infrastructure/db/repositories/promocion-cursor.query";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { TipologiaPayloadFull as TipologiaPayload } from "@/shared/types/tipologia-schema";

/**
 * Full detail for the public detail page.
 * Extends PromocionWithRelations with content blocks and media assets.
 */
export interface PromocionDetail extends PromocionWithRelations {
  contentBlocks: PromocionContentBlock[];
  mediaAssets: MediaAsset[];
}

export interface PromocionWithRelations {
  id: string;
  tenantId: string;
  slug: string | null;
  name: string;
  kind: string;
  status: string;
  operation: string | null;
  propertyType: string | null;
  constructionStatus: string | null;
  island: string | null;
  municipality: string | null;
  address: string | null;
  location: [number, number];
  locationApprox: [number, number];
  mapPrivacyMode: string;
  seoTitle: string | null;
  seoDescription: string | null;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  draftPayload: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  tipologias: TipologiaWithUnidades[];
}

export interface TipologiaWithUnidades {
  id: string;
  tenantId: string;
  promocionId: string;
  name: string;
  usefulArea: number | null;
  builtArea: number | null;
  floors: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  yearBuilt: number | null;
  energyCert: string | null;
  referencePriceSale: number | null;
  referencePriceRent: number | null;
  communityFee: number | null;
  deposit: number | null;
  amenities: string[];
  planAssetId: string | null;
  createdAt: Date;
  updatedAt: Date;
  unidades: UnidadRow[];
}

interface UnidadRow {
  id: string;
  tenantId: string;
  tipologiaId: string;
  identifier: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromocionUpdateData {
  name?: string;
  kind?: string;
  status?: string;
  operation?: string | null;
  propertyType?: string | null;
  constructionStatus?: string | null;
  island?: string | null;
  municipality?: string | null;
  address?: string | null;
  location?: [number, number] | null;
  locationApprox?: [number, number] | null;
  mapPrivacyMode?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  assignedAgentId?: string | null;
  slug?: string;
  draftPayload?: Record<string, unknown> | null;
  /** Optional nested tipologías with unidades to sync. */
  tipologias?: TipologiaPayload[];
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class PromocionRepository extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext | null;

  constructor(ctx: TenantContext) {
    super(ctx);
    this.authCtx = ctx.type === "authenticated" ? (ctx as AuthenticatedContext) : null;
  }

  async findById(
    id: string,
  ): Promise<PromocionWithRelations | null> {
    return this.withTransaction(async (tx) => {
      const [promocion] = await tx
        .select(PROMOCION_SELECT_COLUMNS)
        .from(promociones)
        .leftJoin(users, eq(promociones.assignedAgentId, users.id))
        .where(
          and(
            eq(promociones.id, id),
            eq(promociones.tenantId, this.ctx.getTenantId()),
          ),
        );

      if (!promocion) return null;

      const tipologiasWithUnidades = await this.assembleTipologias(tx, id);

      return {
        ...promocion,
        assignedAgentName: promocion.assignedAgentName ?? null,
        tipologias: tipologiasWithUnidades,
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

    const unidadesByTipologiaId = new Map<string, UnidadRow[]>();
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

  async create(
    data: { name: string; kind: string },
  ): Promise<PromocionRow> {
    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .insert(promociones)
        .values({
          tenantId: this.ctx.getTenantId(),
          slug: null,
          name: data.name,
          kind: data.kind as "portfolio" | "external",
          status: "DRAFT",
          location: [0, 0] as [number, number],
          locationApprox: [0, 0] as [number, number],
          mapPrivacyMode: "EXACT" as "EXACT" | "AREA",
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create promoción");
      }

      return row;
    });
  }

  async update(
    id: string,
    data: PromocionUpdateData,
  ): Promise<PromocionRow> {
    return this.withTransaction(async (tx) => {
      // Fetch current values for history comparison
      const [current] = await tx
        .select()
        .from(promociones)
        .where(
          and(
            eq(promociones.id, id),
            eq(promociones.tenantId, this.ctx.getTenantId()),
          ),
        );

      if (!current) {
        throw new Error(`Promoción with id ${id} not found`);
      }

      // Build update set from provided fields
      const updateData = this.buildUpdateData(data);

      // Perform DB update if any promoción fields changed
      if (Object.keys(updateData).length > 0) {
        const [updated] = await tx
          .update(promociones)
          .set(updateData as Partial<typeof promociones.$inferInsert>)
          .where(
            and(
              eq(promociones.id, id),
              eq(promociones.tenantId, this.ctx.getTenantId()),
            ),
          )
          .returning();

        if (!updated) {
          throw new Error(`Failed to update promoción with id ${id}`);
        }

        // Record audit history via PromocionHistoryRecorder
        const historyRecorder = new PromocionHistoryRecorder(this.ctx);
        await historyRecorder.recordHistory(
          tx,
          id,
          current as unknown as Record<string, unknown>,
          data as unknown as Record<string, unknown>,
          updateData,
        );
      }

      // Sync tipologías if provided
      if (data.tipologias !== undefined) {
        const auth = this.requireAuth();
        const syncService = new TipologiaSyncService(this.ctx, auth);
        await syncService.syncInTx(tx, id, data.tipologias);
      }

      // Re-fetch to return fresh data
      const [result] = await tx
        .select()
        .from(promociones)
        .where(
          and(
            eq(promociones.id, id),
            eq(promociones.tenantId, this.ctx.getTenantId()),
          ),
        );

      if (!result) {
        throw new Error(`Failed to fetch promoción after update`);
      }

      return result;
    });
  }

  /**
   * Builds an update map from PromocionUpdateData, only including fields
   * that are present in the input.
   */
  private buildUpdateData(data: PromocionUpdateData): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    for (const { key, fieldName } of PromocionHistoryRecorder.HISTORY_FIELDS) {
      if (key in data) {
        updateData[fieldName] = data[key as keyof PromocionUpdateData];
      }
    }
    return updateData;
  }

  /** Ensures auth context is available, throwing if not. */
  private requireAuth(): AuthenticatedContext {
    if (!this.authCtx) {
      throw new Error("Authentication required for this operation");
    }
    return this.authCtx;
  }

  async updateDraft(
    id: string,
    draftPayload: Record<string, unknown> | null,
  ): Promise<PromocionRow> {
    return this.withTransaction(async (tx) => {
      const [updated] = await tx
        .update(promociones)
        .set({ draftPayload })
        .where(
          and(
            eq(promociones.id, id),
            eq(promociones.tenantId, this.ctx.getTenantId()),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error(`Failed to update draft for promoción ${id}`);
      }

      return updated;
    });
  }

  async delete(id: string): Promise<PromocionRow> {
    return this.withTransaction(async (tx) => {
      const [deleted] = await tx
        .delete(promociones)
        .where(
          and(
            eq(promociones.id, id),
            eq(promociones.tenantId, this.ctx.getTenantId()),
          ),
        )
        .returning();

      if (!deleted) {
        throw new Error(`Promoción with id ${id} not found`);
      }

      return deleted;
    });
  }


}

type PromocionRow = typeof promociones.$inferSelect;

// Re-exportar tipos movidos a promocion-cursor.query.ts para mantener
// compatibilidad con los imports existentes.
export type {
  PromocionListRow,
  CursorResult,
  PromocionFilters,
} from "@/infrastructure/db/repositories/promocion-cursor.query";
export { PROMOCION_SELECT_COLUMNS } from "@/infrastructure/db/repositories/promocion-cursor.query";
