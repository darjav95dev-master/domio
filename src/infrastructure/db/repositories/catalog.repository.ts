import { eq, and, desc, count, or, lt, sql, inArray, gte, lte } from "drizzle-orm";
import {
  promociones,
  tipologias,
  users,
  mediaAssets,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";
import type {
  PropertyType,
  OperationType,
  ConstructionStatus,
  Amenity,
} from "@/shared/constants/db-enums";
import { encodeCursor, decodeCursor } from "./cursor-encoder";
import type { PromocionListRow } from "./promocion.repository";
import { PROMOCION_SELECT_COLUMNS } from "./promocion.repository";

// ---------------------------------------------------------------------------
// Public Catalog Types
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

export interface CatalogCardExtras {
  coverR2Key: string | null;
  coverAlt: string | null;
  priceFrom: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

export interface ApiCursorOptions {
  cursor?: string;
  limit?: number;
}

export interface ApiCursorResult {
  items: PromocionListRow[];
  nextCursor: string | null;
  total: number;
}

// ---------------------------------------------------------------------------
// Catalog Repository
// ---------------------------------------------------------------------------

/**
 * Repository for public catalog and API cursor-paginated queries.
 *
 * Separated from PromocionRepository to respect SRP — cursor pagination
 * for public-facing endpoints has different change reasons than backoffice
 * CRUD operations.
 */
export class CatalogRepository extends TenantAwareRepository {
  constructor(ctx: TenantContext) {
    super(ctx);
  }

  // -------------------------------------------------------------------------
  // API Public — cursor pagination with mandatory filters
  // -------------------------------------------------------------------------

  /**
   * Fetches promociones for the API pública v1.
   *
   * Applies mandatory filters:
   * - kind = 'portfolio'
   * - status = 'PUBLISHED'
   *
   * Cursor pagination based on updated_at DESC, id DESC.
   */
  async findForApiCursor(
    options: ApiCursorOptions = {},
  ): Promise<ApiCursorResult> {
    return this.withTransaction(async (tx) => {
      const limit = Math.min(Math.max(1, options.limit ?? 20), 100);

      const conditions: (ReturnType<typeof eq> | ReturnType<typeof or> | ReturnType<typeof lt>)[] = [
        eq(promociones.tenantId, this.ctx.getTenantId()),
        eq(promociones.kind, "portfolio"),
        eq(promociones.status, "PUBLISHED"),
      ];

      if (options.cursor) {
        const { sortKey, id } = decodeCursor(options.cursor);
        const cursorDate = new Date(sortKey);
        conditions.push(
          or(
            lt(promociones.updatedAt, cursorDate),
            and(
              eq(promociones.updatedAt, cursorDate),
              lt(promociones.id, id),
            ),
          ),
        );
      }

      const whereClause = and(...conditions);

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

      const items = await tx
        .select(PROMOCION_SELECT_COLUMNS)
        .from(promociones)
        .leftJoin(users, eq(promociones.assignedAgentId, users.id))
        .where(whereClause)
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

  // -------------------------------------------------------------------------
  // Public Catalog — cursor pagination
  // -------------------------------------------------------------------------

  /**
   * Builds the WHERE conditions for the public catalog from filters.
   * Only includes conditions on `promociones` columns.
   * Tipología filters (bedrooms, bathrooms, price, amenities) are handled
   * via a single JOIN subquery — see buildTipologiaFilter().
   */
  private buildPublicConditions(
    filters: PublicCatalogFilters,
  ): ReturnType<typeof eq>[] {
    const conditions: ReturnType<typeof eq>[] = [
      eq(promociones.tenantId, this.ctx.getTenantId()),
      eq(promociones.status, "PUBLISHED"),
    ];

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

    return conditions;
  }

  /**
   * Returns true when any tipología filter is active (bedrooms, bathrooms,
   * price range, or amenities). Used to decide whether to add the tipologia JOIN.
   */
  private hasTipologiaFilters(filters: PublicCatalogFilters): boolean {
    return !!(
      filters.bedrooms ||
      filters.bathrooms ||
      filters.priceMin ||
      filters.priceMax ||
      (filters.amenities && filters.amenities.length > 0)
    );
  }

  /**
   * Builds a materialised subquery on `tipologias` that pre-filters to
   * promocion IDs matching the given tipología filters. The result is
   * inner-joined to the main query when tipología filters are active,
   * replacing the N correlated EXISTS subqueries with a single scan.
   */
  private buildTipologiaFilter(
    tx: Transaction,
    filters: PublicCatalogFilters,
  ) {
    const tipologiaConditions: (ReturnType<typeof gte> | ReturnType<typeof lte> | ReturnType<typeof sql>)[] = [];

    if (filters.bedrooms)
      tipologiaConditions.push(gte(tipologias.bedrooms, filters.bedrooms));
    if (filters.bathrooms)
      tipologiaConditions.push(gte(tipologias.bathrooms, filters.bathrooms));
    if (filters.priceMin)
      tipologiaConditions.push(gte(tipologias.referencePriceSale, filters.priceMin));
    if (filters.priceMax)
      tipologiaConditions.push(lte(tipologias.referencePriceSale, filters.priceMax));

    if (filters.amenities && filters.amenities.length > 0) {
      for (const amenity of filters.amenities) {
        const amenityJson = JSON.stringify([amenity]);
        tipologiaConditions.push(
          sql`${tipologias.amenities} @> ${amenityJson}::jsonb`,
        );
      }
    }

    return tx
      .select({ promocionId: tipologias.promocionId })
      .from(tipologias)
      .where(and(...tipologiaConditions))
      .groupBy(tipologias.promocionId)
      .as("tipologia_filter");
  }

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

      const whereClause = and(...this.buildPublicConditions(filters));
      const tipologiaFilter = this.hasTipologiaFilters(filters)
        ? this.buildTipologiaFilter(tx, filters)
        : null;

      let total = 0;
      if (!options?.cursor) {
        let countQuery = tx
          .select({ count: count() })
          .from(promociones)
          .$dynamic();

        if (tipologiaFilter) {
          countQuery = countQuery.innerJoin(
            tipologiaFilter,
            eq(tipologiaFilter.promocionId, promociones.id),
          );
        }

        const [totalRow] = await countQuery.where(whereClause);

        total = Number(totalRow?.count ?? 0);
        if (total === 0) {
          return { items: [], nextCursor: null, total: 0 };
        }
      }

      if (sort === "price_asc" || sort === "price_desc") {
        return this.fetchPublicWithPriceSort(
          tx, whereClause, tipologiaFilter, sort, limit, options?.cursor, total,
        );
      }

      return this.fetchPublicWithPublishedSort(
        tx, whereClause, tipologiaFilter, limit, options?.cursor, total,
      );
    });
  }

  /**
   * Fetches catalog page ordered by created_at DESC, id DESC (published sort).
   */
  private async fetchPublicWithPublishedSort(
    tx: Transaction,
    whereClause: ReturnType<typeof and>,
    tipologiaFilter: ReturnType<typeof this.buildTipologiaFilter> | null,
    limit: number,
    cursor: string | undefined,
    total: number,
  ): Promise<CatalogCursorResult> {
    const conditions: ReturnType<typeof or>[] = [];

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

    let query = tx
      .select(PROMOCION_SELECT_COLUMNS)
      .from(promociones)
      .leftJoin(users, eq(promociones.assignedAgentId, users.id))
      .$dynamic();

    if (tipologiaFilter) {
      query = query.innerJoin(
        tipologiaFilter,
        eq(tipologiaFilter.promocionId, promociones.id),
      );
    }

    const items = await query
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
    tipologiaFilter: ReturnType<typeof this.buildTipologiaFilter> | null,
    sort: CatalogSortOption,
    limit: number,
    cursor: string | undefined,
    total: number,
  ): Promise<CatalogCursorResult> {
    const priceAgg = tx
      .select({
        promocionId: tipologias.promocionId,
        minPrice: sql<number>`MIN(${tipologias.referencePriceSale})`.as("min_price"),
        maxPrice: sql<number>`MAX(${tipologias.referencePriceSale})`.as("max_price"),
      })
      .from(tipologias)
      .groupBy(tipologias.promocionId)
      .as("price_agg");

    const priceCol =
      sort === "price_asc"
        ? sql`COALESCE(${priceAgg.minPrice}, 0)`
        : sql`COALESCE(${priceAgg.maxPrice}, 0)`;

    const orderExpr =
      sort === "price_asc"
        ? sql`${priceCol} ASC NULLS LAST, ${promociones.id} ASC`
        : sql`${priceCol} DESC NULLS FIRST, ${promociones.id} DESC`;

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

    let priceQuery = tx
      .select(PROMOCION_SELECT_COLUMNS)
      .from(promociones)
      .leftJoin(users, eq(promociones.assignedAgentId, users.id))
      .leftJoin(priceAgg, eq(priceAgg.promocionId, promociones.id))
      .$dynamic();

    if (tipologiaFilter) {
      priceQuery = priceQuery.innerJoin(
        tipologiaFilter,
        eq(tipologiaFilter.promocionId, promociones.id),
      );
    }

    const rows = await priceQuery
      .where(fullWhere)
      .orderBy(orderExpr)
      .limit(limit + 1);

    const items = rows.slice(0, limit) as unknown as PromocionListRow[];

    let nextCursor: string | null = null;
    if (rows.length > limit && items.length > 0) {
      const last = items[items.length - 1]!;

      if (sort === "price_asc") {
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

  // -------------------------------------------------------------------------
  // Card enrichment — cover image + price/room aggregates for a set of ids
  // -------------------------------------------------------------------------

  /**
   * Given a list of promoción ids, returns per-promoción presentation extras
   * for catalog/home cards: cover image r2Key, price "desde", and the max
   * bedrooms/bathrooms across its tipologías. Two small keyed queries — kept
   * out of the paginated query to avoid disturbing its cursor logic.
   */
  /**
   * Fetches published portfolio promociones by their IDs.
   * Used by the favorites client-side flow: the client sends only the saved IDs.
   * Returns an empty array if ids is empty or no matching PUBLISHED records exist.
   */
  async findPublicByIds(ids: string[]): Promise<Array<PromocionListRow & CatalogCardExtras>> {
    if (ids.length === 0) return [];

    const tenantId = this.ctx.getTenantId();

    const items = await this.ctx.withTransaction(async (tx) => {
      return tx
        .select(PROMOCION_SELECT_COLUMNS)
        .from(promociones)
        .leftJoin(users, eq(promociones.assignedAgentId, users.id))
        .where(
          and(
            eq(promociones.tenantId, tenantId),
            eq(promociones.status, "PUBLISHED"),
            eq(promociones.kind, "portfolio"),
            inArray(promociones.id, ids),
          ),
        );
    });

    if (items.length === 0) return [];

    const extras = await this.findCardExtras(items.map((i) => i.id));

    return items.map((item) => {
      const e = extras.get(item.id);
      return {
        ...item,
        coverR2Key: e?.coverR2Key ?? null,
        coverAlt: e?.coverAlt ?? null,
        priceFrom: e?.priceFrom ?? null,
        bedrooms: e?.bedrooms ?? null,
        bathrooms: e?.bathrooms ?? null,
      };
    });
  }

  async findCardExtras(
    promocionIds: string[],
  ): Promise<Map<string, CatalogCardExtras>> {
    const result = new Map<string, CatalogCardExtras>();
    if (promocionIds.length === 0) return result;

    return this.ctx.withTransaction(async (tx) => {
      const tenantId = this.ctx.getTenantId();

      // Cover image: prefer isCover, else lowest sortOrder gallery image.
      const covers = await tx
        .select({
          ownerId: mediaAssets.ownerId,
          r2Key: mediaAssets.r2Key,
          altText: mediaAssets.altText,
          isCover: mediaAssets.isCover,
          sortOrder: mediaAssets.sortOrder,
        })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.tenantId, tenantId),
            eq(mediaAssets.ownerType, "PROMOCION"),
            eq(mediaAssets.kind, "IMAGE_GALLERY"),
            inArray(mediaAssets.ownerId, promocionIds),
          ),
        )
        .orderBy(desc(mediaAssets.isCover), mediaAssets.sortOrder);

      // Price/room aggregates per promoción.
      const aggs = await tx
        .select({
          promocionId: tipologias.promocionId,
          minPriceSale: sql<number | null>`MIN(${tipologias.referencePriceSale})`,
          minPriceRent: sql<number | null>`MIN(${tipologias.referencePriceRent})`,
          maxBedrooms: sql<number | null>`MAX(${tipologias.bedrooms})`,
          maxBathrooms: sql<number | null>`MAX(${tipologias.bathrooms})`,
        })
        .from(tipologias)
        .where(
          and(
            eq(tipologias.tenantId, tenantId),
            inArray(tipologias.promocionId, promocionIds),
          ),
        )
        .groupBy(tipologias.promocionId);

      for (const id of promocionIds) {
        result.set(id, {
          coverR2Key: null,
          coverAlt: null,
          priceFrom: null,
          bedrooms: null,
          bathrooms: null,
        });
      }
      // covers is ordered isCover DESC, sortOrder ASC → first per owner wins.
      for (const c of covers) {
        const entry = result.get(c.ownerId);
        if (entry && entry.coverR2Key === null) {
          entry.coverR2Key = c.r2Key;
          entry.coverAlt = c.altText;
        }
      }
      for (const a of aggs) {
        const entry = result.get(a.promocionId);
        if (!entry) continue;
        entry.priceFrom = firstNonNull(a.minPriceSale, a.minPriceRent);
        entry.bedrooms = toNumberOrNull(a.maxBedrooms);
        entry.bathrooms = toNumberOrNull(a.maxBathrooms);
      }

      return result;
    });
  }
}

/** Numeric value of the first non-null argument, else null. */
function firstNonNull(...values: (number | null)[]): number | null {
  for (const v of values) {
    if (v != null) return Number(v);
  }
  return null;
}

function toNumberOrNull(value: number | null): number | null {
  return value != null ? Number(value) : null;
}
