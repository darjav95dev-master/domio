import { z } from "zod";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import { CatalogRepository } from "@/infrastructure/db/repositories/catalog.repository";
import type {
  PublicCatalogFilters,
  CatalogSortOption,
} from "@/infrastructure/db/repositories/catalog.repository";
import { PROPERTY_TYPES, OPERATION_TYPES, CONSTRUCTION_STATUSES, AMENITIES } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Zod schema for catalog input validation
// ---------------------------------------------------------------------------

const catalogInputSchema = z.object({
  island: z.string().min(1).optional(),
  municipality: z.string().min(1).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional().catch(undefined),
  operation: z.enum(OPERATION_TYPES).optional().catch(undefined),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  amenities: z.array(z.enum(AMENITIES)).optional().catch(undefined),
  constructionStatus: z.enum(CONSTRUCTION_STATUSES).optional().catch(undefined),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sort: z.enum(["price_asc", "price_desc", "published"]).optional().catch(undefined),
});

export type CatalogInput = z.infer<typeof catalogInputSchema>;

export interface CatalogDataResult {
  items: Array<{
    id: string;
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
    coverR2Key: string | null;
    coverAlt: string | null;
    priceFrom: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
  }>;
  nextCursor: string | null;
  total: number;
}

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export async function getCatalogData(
  input: CatalogInput,
): Promise<CatalogDataResult> {
  const parsed = catalogInputSchema.parse(input);

  const ctx = new PublicContext();
  const repo = new CatalogRepository(ctx);

  const filters: PublicCatalogFilters = {
    island: parsed.island,
    municipality: parsed.municipality,
    propertyType: parsed.propertyType,
    operation: parsed.operation,
    priceMin: parsed.priceMin,
    priceMax: parsed.priceMax,
    bedrooms: parsed.bedrooms,
    bathrooms: parsed.bathrooms,
    amenities: parsed.amenities,
    constructionStatus: parsed.constructionStatus,
  };

  const sort = (parsed.sort ?? "published") as CatalogSortOption;

  const result = await repo.findPublicWithCursor(filters, {
    cursor: parsed.cursor,
    limit: parsed.limit ?? 12,
    sort,
  });

  const extras = await repo.findCardExtras(result.items.map((i) => i.id));

  return {
    items: result.items.map((item) => {
      const e = extras.get(item.id);
      return {
        ...item,
        coverR2Key: e?.coverR2Key ?? null,
        coverAlt: e?.coverAlt ?? null,
        priceFrom: e?.priceFrom ?? null,
        bedrooms: e?.bedrooms ?? null,
        bathrooms: e?.bathrooms ?? null,
      };
    }),
    nextCursor: result.nextCursor,
    total: result.total,
  };
}
