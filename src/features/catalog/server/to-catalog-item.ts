import type { CatalogItem } from "@/features/catalog/components/PropertyCard";
import type { CatalogDataResult } from "@/features/catalog/server/get-catalog-data";
import { getPublicMediaUrl } from "@/infrastructure/media/public-url";

/**
 * Maps a catalog server item to a CatalogItem for presentation, resolving the
 * cover image r2Key to a public URL. Shared by /portafolio and /favoritos.
 */
export function toCatalogItem(
  raw: CatalogDataResult["items"][number],
): CatalogItem {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    kind: raw.kind,
    status: raw.status,
    operation: raw.operation,
    propertyType: raw.propertyType,
    constructionStatus: raw.constructionStatus,
    island: raw.island,
    municipality: raw.municipality,
    address: raw.address,
    price: raw.priceFrom,
    currency: "EUR",
    imageUrl: raw.coverR2Key ? getPublicMediaUrl(raw.coverR2Key) : null,
    bedrooms: raw.bedrooms,
    bathrooms: raw.bathrooms,
    location: raw.location,
    locationApprox: raw.locationApprox,
    mapPrivacyMode: raw.mapPrivacyMode,
    seoTitle: raw.seoTitle,
    seoDescription: raw.seoDescription,
    assignedAgentId: raw.assignedAgentId,
    assignedAgentName: raw.assignedAgentName,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
