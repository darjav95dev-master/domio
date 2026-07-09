import { eq, and, inArray, desc, count } from "drizzle-orm";
import {
  promociones,
  tipologias,
  unidades,
  promocionContentBlocks,
  mediaAssets,
  users,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { contentBlockSchema } from "@/shared/types/content-block-schema";
import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";
import type { MediaAsset } from "@/infrastructure/db/schema/media-assets";
import { TipologiaSyncService } from "@/features/promociones/services/tipologia-sync.service";
import { PromocionHistoryRepository } from "@/infrastructure/db/repositories/promocion-history.repository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";
import type {
  PromocionStatus,
  PromocionKind,
  ConstructionStatus,
  ContentBlockType,
} from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Shared select columns
// ---------------------------------------------------------------------------

export const PROMOCION_SELECT_COLUMNS = {
  id: promociones.id,
  tenantId: promociones.tenantId,
  slug: promociones.slug,
  name: promociones.name,
  kind: promociones.kind,
  status: promociones.status,
  operation: promociones.operation,
  propertyType: promociones.propertyType,
  constructionStatus: promociones.constructionStatus,
  island: promociones.island,
  municipality: promociones.municipality,
  address: promociones.address,
  location: promociones.location,
  locationApprox: promociones.locationApprox,
  mapPrivacyMode: promociones.mapPrivacyMode,
  seoTitle: promociones.seoTitle,
  seoDescription: promociones.seoDescription,
  assignedAgentId: promociones.assignedAgentId,
  assignedAgentName: users.name,
  draftPayload: promociones.draftPayload,
  createdAt: promociones.createdAt,
  updatedAt: promociones.updatedAt,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromocionFilters {
  status?: PromocionStatus;
  kind?: PromocionKind;
  island?: string;
  municipality?: string;
  assignedAgentId?: string;
  constructionStatus?: ConstructionStatus;
}

import { PaginatedResult } from "@/shared/types/pagination";
import type { TipologiaPayloadFull as TipologiaPayload, UnidadPayload } from "@/shared/types/tipologia-schema";

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

interface HistoryEntry {
  id: string;
  tenantId: string;
  promocionId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  authorId: string;
  createdAt: Date;
}

export interface HistoryEntryWithAuthor extends HistoryEntry {
  authorName: string | null;
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

  async findAll(
    filters: PromocionFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<PromocionListRow>> {
    return this.withTransaction(async (tx) => {
      const conditions: ReturnType<typeof eq>[] = [
        eq(promociones.tenantId, this.ctx.getTenantId()),
      ];

      if (filters.status) {
        conditions.push(eq(promociones.status, filters.status));
      }
      if (filters.kind) {
        conditions.push(eq(promociones.kind, filters.kind));
      }
      if (filters.island) {
        conditions.push(eq(promociones.island, filters.island));
      }
      if (filters.municipality) {
        conditions.push(eq(promociones.municipality, filters.municipality));
      }
      if (filters.constructionStatus) {
        conditions.push(
          eq(promociones.constructionStatus, filters.constructionStatus),
        );
      }

      // AGENT role: always filter by assignedAgentId = current user
      if (this.authCtx!.role === "AGENT") {
        conditions.push(
          eq(promociones.assignedAgentId, this.authCtx!.userId),
        );
      } else if (filters.assignedAgentId) {
        // For ADMIN/OPERATOR, use the explicit filter if provided
        conditions.push(
          eq(promociones.assignedAgentId, filters.assignedAgentId),
        );
      }

      const whereClause = and(...conditions);
      const offset = (page - 1) * limit;

      const items = await tx
  .select(PROMOCION_SELECT_COLUMNS)
        .from(promociones)
        .leftJoin(users, eq(promociones.assignedAgentId, users.id))
        .where(whereClause)
        .orderBy(desc(promociones.updatedAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await tx
        .select({ count: count() })
        .from(promociones)
        .where(whereClause);

      const total = Number(totalResult[0]?.count ?? 0);

      return { items, total };
    });
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

      const tipologiasWithUnidades = await this.assembleTipologias(
        tx,
        promocion.id,
      );

      const contentBlocks = await tx
        .select()
        .from(promocionContentBlocks)
        .where(
          and(
            eq(promocionContentBlocks.promocionId, promocion.id),
            eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
          ),
        )
        .orderBy(promocionContentBlocks.sortOrder);

      const assets = await tx
        .select()
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.ownerId, promocion.id),
            eq(mediaAssets.ownerType, "PROMOCION"),
            eq(mediaAssets.tenantId, this.ctx.getTenantId()),
          ),
        )
        .orderBy(mediaAssets.sortOrder);

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

      // Build update set — only include provided fields
      const updateData: Record<string, unknown> = {};
      const fieldsToCompare: Array<{
        key: string;
        fieldName: string;
      }> = [
        { key: "name", fieldName: "name" },
        { key: "kind", fieldName: "kind" },
        { key: "status", fieldName: "status" },
        { key: "operation", fieldName: "operation" },
        { key: "propertyType", fieldName: "propertyType" },
        { key: "constructionStatus", fieldName: "constructionStatus" },
        { key: "island", fieldName: "island" },
        { key: "municipality", fieldName: "municipality" },
        { key: "address", fieldName: "address" },
        { key: "location", fieldName: "location" },
        { key: "locationApprox", fieldName: "locationApprox" },
        { key: "mapPrivacyMode", fieldName: "mapPrivacyMode" },
        { key: "seoTitle", fieldName: "seoTitle" },
        { key: "seoDescription", fieldName: "seoDescription" },
        { key: "assignedAgentId", fieldName: "assignedAgentId" },
        { key: "slug", fieldName: "slug" },
        { key: "draftPayload", fieldName: "draftPayload" },
      ];

      for (const { key, fieldName } of fieldsToCompare) {
        if (key in data) {
          const val = data[key as keyof PromocionUpdateData];
          updateData[fieldName] = val;
        }
      }

      // Skip DB update if no promoción fields changed
      const hasPromocionUpdates = Object.keys(updateData).length > 0;

      if (hasPromocionUpdates) {
        // Perform the update
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

        // Exclude internal fields (slug, draftPayload) from history recording
        const historyFields = fieldsToCompare.filter(
          (f) => f.key !== "slug" && f.key !== "draftPayload",
        );
        const historyRepo = new PromocionHistoryRepository(this.ctx);
        await historyRepo.recordFieldChanges(
          tx,
          id,
          current,
          historyFields,
          data as unknown as Record<string, unknown>,
          updateData,
          this.authCtx!.userId,
        );
      }

      // Sync tipologías if provided (creates, updates, deletes)
      if (data.tipologias !== undefined) {
        const syncService = new TipologiaSyncService(this.ctx, this.authCtx!);
        await syncService.syncInTx(tx, id, data.tipologias);
      }

      // Re-fetch the current state if we need to return it
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

/** Row returned by findAll — includes assignedAgentName from users join. */
export type PromocionListRow = PromocionRow & {
  assignedAgentName: string | null;
};
