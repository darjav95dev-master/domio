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
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  operation: z.enum(OPERATION_TYPES).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  amenities: z.array(z.enum(AMENITIES)).optional(),
  constructionStatus: z.enum(CONSTRUCTION_STATUSES).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sort: z.enum(["price_asc", "price_desc", "published"]).optional(),
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

  return {
    items: result.items,
    nextCursor: result.nextCursor,
    total: result.total,
  };
}
