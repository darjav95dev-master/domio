import { getRelatedProperties } from "../server/get-related-properties";
import { PropertyCard } from "@/features/catalog/components/PropertyCard";
import type { CatalogItem } from "@/features/catalog/components/PropertyCard";
import type { GeometryPoint } from "@/infrastructure/db/schema/geo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RelatedPropertiesProps {
  promocionId: string;
  location: GeometryPoint;
  municipality: string | null;
}

// ---------------------------------------------------------------------------
// Helper: map RelatedProperty → CatalogItem for PropertyCard
// ---------------------------------------------------------------------------

function mapToCatalogItem(
  rp: Awaited<ReturnType<typeof getRelatedProperties>>[number],
): CatalogItem {
  return {
    id: rp.id,
    slug: rp.slug,
    name: rp.name,
    kind: "portfolio",
    status: "PUBLISHED",
    operation: rp.operation,
    propertyType: rp.propertyType,
    constructionStatus: null,
    island: null,
    municipality: rp.municipality,
    address: null,
    price: rp.price,
    currency: "EUR",
    imageUrl: rp.imageUrl,
    bedrooms: null,
    bathrooms: null,
    location: [0, 0] as [number, number],
    locationApprox: [0, 0] as [number, number],
    mapPrivacyMode: "AREA",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export async function RelatedProperties({
  promocionId,
  location,
  municipality,
}: RelatedPropertiesProps) {
  const related = await getRelatedProperties(promocionId, location);

  if (related.length === 0) {
    return null;
  }

  const zoneLabel = municipality ?? "la misma zona";

  return (
    <section className="bg-bg-surface-sunken" aria-label="Inmuebles relacionados">
      <div className="mx-auto max-w-[1280px] px-6 py-section-md md:px-10 md:py-section-lg">
        {/* Eyebrow + title */}
        <div className="mb-10">
          <p className="relative mb-3 pl-10 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent-default before:absolute before:left-0 before:top-1/2 before:h-px before:w-8 before:-translate-y-1/2 before:bg-[linear-gradient(90deg,var(--accent-default),transparent)]">
            Relacionados
          </p>
          <h2 className="font-display text-[clamp(28px,3.2vw,40px)] font-normal tracking-[-0.035em] leading-[1.05] text-fg-default">
            Otros inmuebles en {zoneLabel}
          </h2>
        </div>

        {/* Property Cards grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {related.map((property) => (
            <PropertyCard
              key={property.id}
              item={mapToCatalogItem(property)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
