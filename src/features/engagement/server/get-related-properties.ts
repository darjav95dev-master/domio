import { eq, sql, and } from "drizzle-orm";
import { promociones, tipologias, mediaAssets } from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";
import type { GeometryPoint } from "@/infrastructure/db/schema/geo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RelatedProperty {
  id: string;
  slug: string;
  name: string;
  propertyType: string | null;
  operation: string | null;
  price: number | null;
  area: number | null;
  municipality: string | null;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns related properties for a given promocion.
 * Criteria:
 * - PUBLISHED status only
 * - Same propertyType
 * - PostGIS ST_DWithin 5km radius
 * - Price ±20% of current promocion's minimum reference price
 * - Excludes the current promocion
 * - Maximum 4 results
 */
export async function getRelatedProperties(
  promocionId: string,
  location: GeometryPoint,
): Promise<RelatedProperty[]> {
  const ctx = new PublicContext();
  return getRelatedPropertiesService(ctx, promocionId, location);
}

// ---------------------------------------------------------------------------
// Service (testable)
// ---------------------------------------------------------------------------

export async function getRelatedPropertiesService(
  ctx: TenantContext,
  promocionId: string,
  location: GeometryPoint,
): Promise<RelatedProperty[]> {
  return ctx.withTransaction(async (tx) => {
    // 1. Get current promocion's propertyType and min reference price
    const [current] = await tx
      .select({
        propertyType: promociones.propertyType,
        minPrice: sql<number>`COALESCE(MIN(${tipologias.referencePriceSale}), 0)`,
      })
      .from(promociones)
      .leftJoin(
        tipologias,
        and(
          eq(tipologias.promocionId, promociones.id),
          eq(tipologias.tenantId, promociones.tenantId),
        ),
      )
      .where(
        and(
          eq(promociones.id, promocionId),
          eq(promociones.tenantId, ctx.getTenantId()),
        ),
      )
      .groupBy(promociones.propertyType)
      .limit(1);

    if (!current || !current.propertyType) {
      return [];
    }

    const minPrice = Number(current.minPrice ?? 0);
    const priceMin = Math.round(minPrice * 0.8);
    const priceMax = Math.round(minPrice * 1.2);
    const [lng, lat] = location;

    // 2. Find related properties using Drizzle query builder
    const rows = await tx
      .select({
        id: promociones.id,
        slug: promociones.slug,
        name: promociones.name,
        propertyType: promociones.propertyType,
        operation: promociones.operation,
        municipality: promociones.municipality,
        minPrice: sql<number>`
          COALESCE((
            SELECT MIN(${tipologias.referencePriceSale})
            FROM ${tipologias}
            WHERE ${tipologias.promocionId} = ${promociones.id}
              AND ${tipologias.tenantId} = ${promociones.tenantId}
          ), 0)
        `.as("min_price"),
        usefulArea: sql<number>`
          COALESCE((
            SELECT MIN(${tipologias.usefulArea})
            FROM ${tipologias}
            WHERE ${tipologias.promocionId} = ${promociones.id}
              AND ${tipologias.tenantId} = ${promociones.tenantId}
          ), 0)
        `.as("useful_area"),
        coverUrl: mediaAssets.r2Key,
      })
      .from(promociones)
      .leftJoin(
        mediaAssets,
        and(
          eq(mediaAssets.ownerId, promociones.id),
          eq(mediaAssets.ownerType, "PROMOCION"),
          eq(mediaAssets.isCover, true),
          eq(mediaAssets.tenantId, promociones.tenantId),
        ),
      )
      .where(
        and(
          eq(promociones.tenantId, ctx.getTenantId()),
          eq(promociones.status, "PUBLISHED"),
          sql`${promociones.id} != ${promocionId}`,
          eq(promociones.propertyType, current.propertyType),
          sql`ST_DWithin(
            ${promociones.location}::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            5000
          )`,
          sql`(
            ${minPrice} = 0
            OR EXISTS (
              SELECT 1 FROM ${tipologias} t2
              WHERE t2.promocion_id = ${promociones.id}
                AND t2.tenant_id = ${promociones.tenantId}
                AND t2.reference_price_sale BETWEEN ${priceMin} AND ${priceMax}
            )
          )`,
        ),
      )
      .orderBy(sql`min_price ASC NULLS LAST`)
      .limit(4);

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      propertyType: row.propertyType ?? null,
      operation: row.operation ?? null,
      price: row.minPrice ?? null,
      area: row.usefulArea ?? null,
      municipality: row.municipality ?? null,
      imageUrl: row.coverUrl ?? null,
    }));
  });
}
