import { eq, and, inArray, desc, count, lt, or } from "drizzle-orm";
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
import { PromocionHistoryRepository } from "@/infrastructure/db/repositories/promocion-history.repository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";
import type {
  PromocionStatus,
  PromocionKind,
  ConstructionStatus,
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

import { DEFAULT_PAGE_SIZE } from "@/shared/constants/domain-config";
import type { TipologiaPayloadFull as TipologiaPayload } from "@/shared/types/tipologia-schema";
import { encodeCursor, decodeCursor } from "@/infrastructure/db/repositories/cursor-encoder";

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

  // ── Cursor-based pagination (replaces OFFSET for the backoffice catalog) ──

  /** Field mapping for history comparison (shared between update and history). */
  private static readonly HISTORY_FIELDS: Array<{ key: string; fieldName: string }> = [
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

  private buildFilterConditions(filters: PromocionFilters): ReturnType<typeof eq>[] {
    const conditions: ReturnType<typeof eq>[] = [
      eq(promociones.tenantId, this.ctx.getTenantId()),
    ];
    if (filters.status) conditions.push(eq(promociones.status, filters.status));
    if (filters.kind) conditions.push(eq(promociones.kind, filters.kind));
    if (filters.island) conditions.push(eq(promociones.island, filters.island));
    if (filters.municipality) conditions.push(eq(promociones.municipality, filters.municipality));
    if (filters.constructionStatus) conditions.push(eq(promociones.constructionStatus, filters.constructionStatus));
    if (!this.authCtx) throw new Error("Este método requiere contexto autenticado");
    if (this.authCtx.role === "AGENT") {
      conditions.push(eq(promociones.assignedAgentId, this.authCtx.userId));
    } else if (filters.assignedAgentId) {
      conditions.push(eq(promociones.assignedAgentId, filters.assignedAgentId));
    }
    return conditions;
  }

  async findAllWithCursor(
    filters: PromocionFilters,
    options: { cursor?: string; limit?: number } = {},
  ): Promise<CursorResult> {
    return this.withTransaction(async (tx) => {
      const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE), 100);
      const whereClause = and(...this.buildFilterConditions(filters));

      // Calculate total only on first page
      let total = 0;
      if (!options.cursor) {
        const [totalRow] = await tx
          .select({ count: count() })
          .from(promociones)
          .where(whereClause);
        total = Number(totalRow?.count ?? 0);
        if (total === 0) {
          return { items: [], nextCursor: null, total: 0 };
        }
      }

      // Apply cursor: fetch items after the cursor position
      const cursorConditions: ReturnType<typeof or>[] = [];
      if (options.cursor) {
        const { sortKey, id } = decodeCursor(options.cursor);
        const cursorDate = new Date(sortKey);
        cursorConditions.push(
          or(
            lt(promociones.updatedAt, cursorDate),
            and(
              eq(promociones.updatedAt, cursorDate),
              lt(promociones.id, id),
            ),
          ),
        );
      }

      const fullWhere = cursorConditions.length > 0
        ? and(whereClause, ...cursorConditions)
        : whereClause;

      const items = await tx
        .select(PROMOCION_SELECT_COLUMNS)
        .from(promociones)
        .leftJoin(users, eq(promociones.assignedAgentId, users.id))
        .where(fullWhere)
        .orderBy(desc(promociones.updatedAt), desc(promociones.id))
        .limit(limit + 1);

      const hasMore = items.length > limit;
      const pageItems = hasMore ? items.slice(0, limit) : items;

      let nextCursor: string | null = null;
      if (hasMore && pageItems.length > 0) {
        const last = pageItems[pageItems.length - 1]!;
        nextCursor = encodeCursor(last.updatedAt.toISOString(), last.id);
      }

      return { items: pageItems, nextCursor, total };
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

        // Record audit history
        await this.recordHistory(tx, id, current, data, updateData);
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
    for (const { key, fieldName } of PromocionRepository.HISTORY_FIELDS) {
      if (key in data) {
        updateData[fieldName] = data[key as keyof PromocionUpdateData];
      }
    }
    return updateData;
  }

  /**
   * Records field-level history for changed promoción fields.
   * Excludes internal fields (slug, draftPayload) from history.
   */
  private async recordHistory(
    tx: Transaction,
    id: string,
    current: typeof promociones.$inferSelect,
    data: PromocionUpdateData,
    updateData: Record<string, unknown>,
  ): Promise<void> {
    const auth = this.requireAuth();
    const historyFields = PromocionRepository.HISTORY_FIELDS.filter(
      (f) => f.key !== "slug" && f.key !== "draftPayload",
    );
    const historyRepo = new PromocionHistoryRepository(this.ctx);
    await historyRepo.recordFieldChanges(
      tx,
      id,
      current as unknown as Record<string, unknown>,
      historyFields,
      data as unknown as Record<string, unknown>,
      updateData,
      auth.userId,
    );
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

/** Row returned by findAllWithCursor — includes assignedAgentName from users join. */
export type PromocionListRow = PromocionRow & {
  assignedAgentName: string | null;
};

/** Row returned by findAllWithCursor — cursor-based pagination result. */
export interface CursorResult {
  items: PromocionListRow[];
  nextCursor: string | null;
  total: number;
}
