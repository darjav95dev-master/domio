import { eq, and, desc, count, or, lt, sql } from "drizzle-orm";
import {
  promociones,
  tipologias,
  users,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";
import type {
  PropertyType,
  OperationType,
  ConstructionStatus,
  Amenity,
} from "@/shared/constants/db-enums";
import { PaginatedResult } from "@/shared/types/pagination";
import { encodeCursor, decodeCursor } from "./cursor-encoder";
import type { PromocionListRow } from "./promocion.repository";

// ---------------------------------------------------------------------------
// Shared select columns (same as in PromocionRepository)
// ---------------------------------------------------------------------------

const CATALOG_SELECT_COLUMNS = {
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
        .select(CATALOG_SELECT_COLUMNS)
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

      const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [
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

      let total = 0;
      if (!options?.cursor) {
        const [totalRow] = await tx
          .select({ count: count() })
          .from(promociones)
          .where(whereClause);

        total = Number(totalRow?.count ?? 0);
        if (total === 0) {
          return { items: [], nextCursor: null, total: 0 };
        }
      }

      if (sort === "price_asc" || sort === "price_desc") {
        return this.fetchPublicWithPriceSort(
          tx, whereClause, filters, sort, limit, options?.cursor, total,
        );
      }

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

    const items = await tx
      .select(CATALOG_SELECT_COLUMNS)
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

    const rows = await tx
      .select(CATALOG_SELECT_COLUMNS)
      .from(promociones)
      .leftJoin(users, eq(promociones.assignedAgentId, users.id))
      .leftJoin(priceAgg, eq(priceAgg.promocionId, promociones.id))
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
}
