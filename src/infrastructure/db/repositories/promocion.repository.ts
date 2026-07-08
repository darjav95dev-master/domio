import { eq, and, inArray, desc, count, or, lt, sql } from "drizzle-orm";
import {
  promociones,
  tipologias,
  unidades,
  promocionHistory,
  promocionContentBlocks,
  users,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { contentBlockSchema } from "@/shared/types/content-block-schema";
import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";
import { TipologiaRepository } from "@/infrastructure/db/repositories/tipologia.repository";
import { UnidadRepository } from "@/infrastructure/db/repositories/unidad.repository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";
import type {
  PromocionStatus,
  PromocionKind,
  ConstructionStatus,
  ContentBlockType,
  PropertyType,
  OperationType,
  Amenity,
} from "@/shared/constants/db-enums";

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

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Public Catalog Types (cursor pagination)
// ---------------------------------------------------------------------------

export interface PublicCatalogFilters {
  island?: string;
  municipality?: string;
  propertyType?: PropertyType;
  operation?: OperationType;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: Amenity[];
  constructionStatus?: ConstructionStatus;
}

export type CatalogSortOption = "price_asc" | "price_desc" | "published";

export interface CatalogCursorResult {
  items: PromocionListRow[];
  nextCursor: string | null;
  total: number;
}

interface CursorPayload {
  sortKey: string;
  id: string;
}

function encodeCursor(sortKey: string, id: string): string {
  return Buffer.from(`${sortKey}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload {
  const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
  const separatorIndex = decoded.lastIndexOf("|");
  if (separatorIndex === -1) {
    throw new Error("Invalid cursor format");
  }
  return {
    sortKey: decoded.slice(0, separatorIndex),
    id: decoded.slice(separatorIndex + 1),
  };
}

export interface PromocionWithRelations {
  id: string;
  tenantId: string;
  slug: string;
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

export interface TipologiaPayload {
  id?: string;
  name: string;
  usefulArea?: number | null;
  builtArea?: number | null;
  floors?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  energyCert?: string | null;
  referencePriceSale?: number | null;
  referencePriceRent?: number | null;
  communityFee?: number | null;
  deposit?: number | null;
  amenities?: string[];
  planAssetId?: string | null;
  unidades?: UnidadPayload[];
}

export interface UnidadPayload {
  id?: string;
  identifier?: string | null;
  status: string;
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
        .select({
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
        })
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

  // ---------------------------------------------------------------------------
  // Public Catalog — cursor pagination
  // ---------------------------------------------------------------------------

  async findPublicWithCursor(
    filters: PublicCatalogFilters,
    options?: {
      cursor?: string;
      limit?: number;
      sort?: CatalogSortOption;
    },
  ): Promise<CatalogCursorResult> {
    return this.ctx.withTransaction(async (tx) => {
      const limit = options?.limit ?? 12;
      const sort = options?.sort ?? "published";

      // -- Build WHERE conditions ---------------------------------------------

      const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [
        eq(promociones.tenantId, this.ctx.getTenantId()),
        eq(promociones.status, "PUBLISHED"),
      ];

      // Direct promocion-level filters
      if (filters.island)
        conditions.push(eq(promociones.island, filters.island));
      if (filters.municipality)
        conditions.push(eq(promociones.municipality, filters.municipality));
      if (filters.propertyType)
        conditions.push(eq(promociones.propertyType, filters.propertyType));
      if (filters.operation)
        conditions.push(eq(promociones.operation, filters.operation));
      if (filters.constructionStatus)
        conditions.push(
          eq(promociones.constructionStatus, filters.constructionStatus),
        );

      // Tipologia-dependent filters via EXISTS subqueries
      if (filters.bedrooms) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM tipologias t WHERE t.promocion_id = ${promociones.id} AND t.tenant_id = ${promociones.tenantId} AND t.bedrooms >= ${filters.bedrooms})`,
        );
      }
      if (filters.bathrooms) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM tipologias t WHERE t.promocion_id = ${promociones.id} AND t.tenant_id = ${promociones.tenantId} AND t.bathrooms >= ${filters.bathrooms})`,
        );
      }
      if (filters.priceMin) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM tipologias t WHERE t.promocion_id = ${promociones.id} AND t.tenant_id = ${promociones.tenantId} AND t.reference_price_sale >= ${filters.priceMin})`,
        );
      }
      if (filters.priceMax) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM tipologias t WHERE t.promocion_id = ${promociones.id} AND t.tenant_id = ${promociones.tenantId} AND t.reference_price_sale <= ${filters.priceMax})`,
        );
      }
      if (filters.amenities && filters.amenities.length > 0) {
        for (const amenity of filters.amenities) {
          const amenityJson = JSON.stringify([amenity]);
          conditions.push(
            sql`EXISTS (SELECT 1 FROM tipologias t WHERE t.promocion_id = ${promociones.id} AND t.tenant_id = ${promociones.tenantId} AND t.amenities @> ${amenityJson}::jsonb)`,
          );
        }
      }

      const whereClause = and(...conditions);

      // -- Count total --------------------------------------------------------

      const [totalRow] = await tx
        .select({ count: count() })
        .from(promociones)
        .where(whereClause);

      const total = Number(totalRow?.count ?? 0);
      if (total === 0) {
        return { items: [], nextCursor: null, total: 0 };
      }

      // -- Fetch items with cursor pagination ---------------------------------

      if (sort === "price_asc" || sort === "price_desc") {
        return this.fetchPublicWithPriceSort(
          tx, whereClause, filters, sort, limit, options?.cursor, total,
        );
      }

      // Default: published sort (created_at DESC, id DESC)
      return this.fetchPublicWithPublishedSort(
        tx, whereClause, limit, options?.cursor, total,
      );
    });
  }

  /**
   * Fetches catalog page ordered by created_at DESC, id DESC (published sort).
   */
  private async fetchPublicWithPublishedSort(
    tx: Transaction,
    whereClause: ReturnType<typeof and>,
    limit: number,
    cursor: string | undefined,
    total: number,
  ): Promise<CatalogCursorResult> {
    const conditions = [];

    if (cursor) {
      const { sortKey, id } = decodeCursor(cursor);
      const cursorDate = new Date(sortKey);
      conditions.push(
        or(
          lt(promociones.createdAt, cursorDate),
          and(eq(promociones.createdAt, cursorDate), lt(promociones.id, id)),
        ),
      );
    }

    const items = await tx
      .select({
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
      })
      .from(promociones)
      .leftJoin(users, eq(promociones.assignedAgentId, users.id))
      .where(and(whereClause, ...conditions))
      .orderBy(desc(promociones.createdAt), desc(promociones.id))
      .limit(limit + 1);

    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    let nextCursor: string | null = null;
    if (hasMore && pageItems.length > 0) {
      const last = pageItems[pageItems.length - 1]!;
      nextCursor = encodeCursor(last.createdAt.toISOString(), last.id);
    }

    return { items: pageItems, nextCursor, total };
  }

  /**
   * Fetches catalog page ordered by minimum reference price.
   */
  private async fetchPublicWithPriceSort(
    tx: Transaction,
    whereClause: ReturnType<typeof and>,
    _filters: PublicCatalogFilters,
    sort: CatalogSortOption,
    limit: number,
    cursor: string | undefined,
    total: number,
  ): Promise<CatalogCursorResult> {
    // Build a price aggregation subquery
    const priceAgg = tx
      .select({
        promocionId: tipologias.promocionId,
        minPrice: sql<number>`MIN(${tipologias.referencePriceSale})`.as(
          "min_price",
        ),
        maxPrice: sql<number>`MAX(${tipologias.referencePriceSale})`.as(
          "max_price",
        ),
      })
      .from(tipologias)
      .groupBy(tipologias.promocionId)
      .as("price_agg");

    // For price_asc: ORDER BY min_price ASC NULLS LAST, id ASC
    // For price_desc: ORDER BY max_price DESC NULLS FIRST, id DESC
    const priceCol =
      sort === "price_asc"
        ? sql`COALESCE(${priceAgg.minPrice}, 0)`
        : sql`COALESCE(${priceAgg.maxPrice}, 0)`;

    const orderExpr =
      sort === "price_asc"
        ? sql`${priceCol} ASC NULLS LAST, ${promociones.id} ASC`
        : sql`${priceCol} DESC NULLS FIRST, ${promociones.id} DESC`;

    // Build cursor condition
    const cursorConditions: ReturnType<typeof sql>[] = [];
    if (cursor) {
      const { sortKey, id } = decodeCursor(cursor);
      const cursorPrice = Number(sortKey);

      if (sort === "price_asc") {
        cursorConditions.push(
          sql`(COALESCE(${priceAgg.minPrice}, 0) > ${cursorPrice} OR (COALESCE(${priceAgg.minPrice}, 0) = ${cursorPrice} AND ${promociones.id} > ${id}))`,
        );
      } else {
        cursorConditions.push(
          sql`(COALESCE(${priceAgg.maxPrice}, 0) < ${cursorPrice} OR (COALESCE(${priceAgg.maxPrice}, 0) = ${cursorPrice} AND ${promociones.id} < ${id}))`,
        );
      }
    }

    const cursorClause = cursorConditions.length > 0
      ? and(...cursorConditions)
      : undefined;

    const fullWhere = cursorClause
      ? and(whereClause, cursorClause)
      : whereClause;

    const rows = await tx
      .select({
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
      })
      .from(promociones)
      .leftJoin(users, eq(promociones.assignedAgentId, users.id))
      .leftJoin(priceAgg, eq(priceAgg.promocionId, promociones.id))
      .where(fullWhere)
      .orderBy(orderExpr)
      .limit(limit + 1);

    // Map the Drizzle raw rows to PromocionListRow (strip computed columns)
    const items = rows.slice(0, limit) as unknown as PromocionListRow[];

    let nextCursor: string | null = null;
    if (rows.length > limit && items.length > 0) {
      const last = items[items.length - 1]!;

      if (sort === "price_asc") {
        // Need to get the actual minPrice for this item. Re-fetch from the row data.
        // Since rows has the raw result with price_agg columns, extract it
        const lastRow = rows[limit - 1] as Record<string, unknown>;
        const lastPrice = String(lastRow?.min_price ?? "0");
        nextCursor = encodeCursor(lastPrice, last.id);
      } else {
        const lastRow = rows[limit - 1] as Record<string, unknown>;
        const lastPrice = String(lastRow?.max_price ?? "0");
        nextCursor = encodeCursor(lastPrice, last.id);
      }
    }

    return { items, nextCursor, total };
  }

  async findById(
    id: string,
  ): Promise<PromocionWithRelations | null> {
    return this.withTransaction(async (tx) => {
      const [promocion] = await tx
        .select({
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
          draftPayload: promociones.draftPayload,
          createdAt: promociones.createdAt,
          updatedAt: promociones.updatedAt,
          assignedAgentName: users.name,
        })
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

  private async recordFieldChanges(
    tx: Transaction,
    id: string,
    current: Record<string, unknown>,
    fieldsToCompare: Array<{ key: string; fieldName: string }>,
    data: PromocionUpdateData,
    updateData: Record<string, unknown>,
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
          promocionId: id,
          field: fieldName,
          oldValue: oldJson,
          newValue: newJson,
          authorId: this.authCtx!.userId,
        });
      }
    }
  }

  async create(
    data: { name: string; kind: string },
  ): Promise<PromocionRow> {
    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .insert(promociones)
        .values({
          tenantId: this.ctx.getTenantId(),
          slug: "",
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
        await this.recordFieldChanges(
          tx,
          id,
          current,
          historyFields,
          data,
          updateData,
        );
      }

      // Sync tipologías if provided (creates, updates, deletes)
      if (data.tipologias !== undefined) {
        await this.syncTipologiasInTx(tx, id, data.tipologias);
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

  // ---------------------------------------------------------------------------
  // Content Block methods
  // ---------------------------------------------------------------------------

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

      // 2. Reindex sort_order of remaining blocks
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

      for (let i = 0; i < remaining.length; i++) {
        await tx
          .update(promocionContentBlocks)
          .set({ sortOrder: i })
          .where(
            and(
              eq(promocionContentBlocks.id, remaining[i]!.id),
              eq(
                promocionContentBlocks.tenantId,
                this.ctx.getTenantId(),
              ),
            ),
          );
      }
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
      for (let i = 0; i < orderedBlockIds.length; i++) {
        await tx
          .update(promocionContentBlocks)
          .set({ sortOrder: i })
          .where(
            and(
              eq(promocionContentBlocks.id, orderedBlockIds[i]!),
              eq(promocionContentBlocks.promocionId, promocionId),
              eq(promocionContentBlocks.tenantId, this.ctx.getTenantId()),
            ),
          );
      }
    });
  }

  /**
   * Validates all content blocks for a promotion against their respective Zod schemas.
   * Used to block publishing if any block has invalid payload data.
   *
   * Returns an object with:
   * - `valid`: true if all blocks pass Zod validation
   * - `errors`: array of { blockId, blockType, issues } for each invalid block
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
   * Synchronizes tipologías (and nested unidades) for a promoción.
   *
   * Creates new tipologías (no `id`), updates existing ones (has `id`),
   * and deletes tipologías present in DB but absent from the payload.
   * Unidades within each tipología follow the same create/update/delete
   * pattern. All operations run within the given transaction.
   */
  private async syncTipologiasInTx(
    tx: Transaction,
    promocionId: string,
    tipologiasPayload: TipologiaPayload[],
  ): Promise<void> {
    const tipologiaRepo = new TipologiaRepository(this.authCtx!);
    const unidadRepo = new UnidadRepository(this.authCtx!);

    // Fetch existing tipologías for this promoción
    const existingTipologiasRows = await tx
      .select({ id: tipologias.id })
      .from(tipologias)
      .where(
        and(
          eq(tipologias.promocionId, promocionId),
          eq(tipologias.tenantId, this.ctx.getTenantId()),
        ),
      );

    const existingIds = new Set(existingTipologiasRows.map((t) => t.id));
    const payloadIds = new Set(
      tipologiasPayload.filter((t) => t.id).map((t) => t.id as string),
    );

    // Delete tipologías not in the payload (cascades to unidades)
    for (const existing of existingTipologiasRows) {
      if (!payloadIds.has(existing.id)) {
        await tipologiaRepo.deleteWithTx(tx, existing.id);
      }
    }

    // Process each tipología in the payload
    for (const tipologiaPayload of tipologiasPayload) {
      if (tipologiaPayload.id && existingIds.has(tipologiaPayload.id)) {
        await this.updateOneTipologiaInTx(
          tx, tipologiaRepo, unidadRepo, tipologiaPayload,
        );
      } else {
        await this.createOneTipologiaInTx(
          tx, tipologiaRepo, unidadRepo, promocionId, tipologiaPayload,
        );
      }
    }
  }

  /** Builds a TipologiaUpdateData from a TipologiaPayload. */
  private buildTipologiaUpdate(
    payload: TipologiaPayload,
  ): Parameters<TipologiaRepository["updateWithTx"]>[2] {
    return {
      name: payload.name,
      usefulArea: payload.usefulArea ?? null,
      builtArea: payload.builtArea ?? null,
      floors: payload.floors ?? null,
      bedrooms: payload.bedrooms ?? null,
      bathrooms: payload.bathrooms ?? null,
      yearBuilt: payload.yearBuilt ?? null,
      energyCert: payload.energyCert ?? null,
      referencePriceSale: payload.referencePriceSale ?? null,
      referencePriceRent: payload.referencePriceRent ?? null,
      communityFee: payload.communityFee ?? null,
      deposit: payload.deposit ?? null,
      amenities: payload.amenities,
      planAssetId: payload.planAssetId ?? null,
    };
  }

  /** Builds a TipologiaCreateData from a TipologiaPayload + promocionId. */
  private buildTipologiaCreate(
    promocionId: string,
    payload: TipologiaPayload,
  ): Parameters<TipologiaRepository["createWithTx"]>[1] {
    return {
      promocionId,
      name: payload.name,
      usefulArea: payload.usefulArea ?? null,
      builtArea: payload.builtArea ?? null,
      floors: payload.floors ?? null,
      bedrooms: payload.bedrooms ?? null,
      bathrooms: payload.bathrooms ?? null,
      yearBuilt: payload.yearBuilt ?? null,
      energyCert: payload.energyCert ?? null,
      referencePriceSale: payload.referencePriceSale ?? null,
      referencePriceRent: payload.referencePriceRent ?? null,
      communityFee: payload.communityFee ?? null,
      deposit: payload.deposit ?? null,
      amenities: payload.amenities,
      planAssetId: payload.planAssetId ?? null,
    };
  }

  /** Updates an existing tipología and syncs its unidades. */
  private async updateOneTipologiaInTx(
    tx: Transaction,
    tipologiaRepo: TipologiaRepository,
    unidadRepo: UnidadRepository,
    payload: TipologiaPayload,
  ): Promise<void> {
    await tipologiaRepo.updateWithTx(tx, payload.id!, this.buildTipologiaUpdate(payload));

    if (payload.unidades !== undefined) {
      await this.syncUnidadesInTx(tx, unidadRepo, payload.id!, payload.unidades);
    }
  }

  /** Creates a new tipología and its unidades. */
  private async createOneTipologiaInTx(
    tx: Transaction,
    tipologiaRepo: TipologiaRepository,
    unidadRepo: UnidadRepository,
    promocionId: string,
    payload: TipologiaPayload,
  ): Promise<void> {
    const created = await tipologiaRepo.createWithTx(
      tx, this.buildTipologiaCreate(promocionId, payload),
    );

    if (payload.unidades === undefined) return;

    for (const unidadPayload of payload.unidades) {
      await unidadRepo.createWithTx(tx, {
        tipologiaId: created.id,
        identifier: unidadPayload.identifier ?? null,
        status: unidadPayload.status,
      });
    }
  }

  /**
   * Synchronizes unidades within a tipología.
   * Creates new (no `id`), updates existing (has `id`),
   * and deletes unidades present in DB but absent from the payload.
   */
  private async syncUnidadesInTx(
    tx: Transaction,
    unidadRepo: UnidadRepository,
    tipologiaId: string,
    unidadesPayload: UnidadPayload[],
  ): Promise<void> {
    // Fetch existing unidades for this tipología
    const existingUnidadRows = await tx
      .select({ id: unidades.id })
      .from(unidades)
      .where(
        and(
          eq(unidades.tipologiaId, tipologiaId),
          eq(unidades.tenantId, this.ctx.getTenantId()),
        ),
      );

    const existingUnidadIds = new Set(existingUnidadRows.map((u) => u.id));
    const payloadUnidadIds = new Set(
      unidadesPayload.filter((u) => u.id).map((u) => u.id as string),
    );

    // Delete unidades not in the payload
    for (const existing of existingUnidadRows) {
      if (!payloadUnidadIds.has(existing.id)) {
        await unidadRepo.deleteWithTx(tx, existing.id);
      }
    }

    // Create or update each unidad
    for (const unidadPayload of unidadesPayload) {
      if (unidadPayload.id && existingUnidadIds.has(unidadPayload.id)) {
        await unidadRepo.updateWithTx(tx, unidadPayload.id, {
          identifier: unidadPayload.identifier ?? null,
          status: unidadPayload.status,
        });
      } else {
        await unidadRepo.createWithTx(tx, {
          tipologiaId,
          identifier: unidadPayload.identifier ?? null,
          status: unidadPayload.status,
        });
      }
    }
  }
}

type PromocionRow = typeof promociones.$inferSelect;

/** Row returned by findAll — includes assignedAgentName from users join. */
type PromocionListRow = PromocionRow & {
  assignedAgentName: string | null;
};
