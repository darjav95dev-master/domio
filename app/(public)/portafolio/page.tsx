import { Suspense } from "react";
import type { Metadata } from "next";
import { getCatalogData } from "@/features/catalog/server/get-catalog-data";
import type { CatalogItem } from "@/features/catalog/components/PropertyCard";
import { CatalogGrid } from "@/features/catalog/components/CatalogGrid";
import { EmptyState } from "@/features/catalog/components/EmptyState";
import { FilterBar } from "@/features/catalog/components/FilterBar";
import { Skeleton } from "@/shared/components/skeleton";
import { cn } from "@/shared/utils/cn";
import { buildPageMetadata } from "@/features/seo/server/build-page-metadata";
import { toCatalogItem } from "@/features/catalog/server/to-catalog-item";


// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Promociones | Domio",
    description:
      "Explora nuestras promociones de inmuebles en Canarias. Venta y alquiler de pisos, casas, locales y más.",
    path: "/portafolio",
  });
}

// ---------------------------------------------------------------------------
// Catalog page (Server Component)
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PortafolioPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Parse search params into CatalogInput
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const island = typeof sp.island === "string" ? sp.island : undefined;
  const municipality =
    typeof sp.municipality === "string" ? sp.municipality : undefined;
  const propertyType =
    typeof sp.propertyType === "string" ? sp.propertyType : undefined;
  const operation =
    typeof sp.operation === "string" ? sp.operation : undefined;
  const priceMin =
    typeof sp.priceMin === "string"
      ? Number(sp.priceMin) || undefined
      : undefined;
  const priceMax =
    typeof sp.priceMax === "string"
      ? Number(sp.priceMax) || undefined
      : undefined;
  const bedrooms =
    typeof sp.bedrooms === "string"
      ? Number(sp.bedrooms) || undefined
      : undefined;
  const bathrooms =
    typeof sp.bathrooms === "string"
      ? Number(sp.bathrooms) || undefined
      : undefined;
  const amenities =
    typeof sp.amenities === "string"
      ? sp.amenities.split(",").filter(Boolean)
      : undefined;
  const constructionStatus =
    typeof sp.constructionStatus === "string"
      ? sp.constructionStatus
      : undefined;

  // Determine initial filter values for FilterBar
  const initialFilters: {
    island?: string;
    municipality?: string;
    propertyType?: string;
    operation?: string;
    priceMin?: number;
    priceMax?: number;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[];
    constructionStatus?: string;
  } = {
    island,
    municipality,
    propertyType,
    operation,
    priceMin,
    priceMax,
    bedrooms,
    bathrooms,
    amenities,
    constructionStatus,
  };

  // Sort by published date by default
  const sort = "published" as const;

  // Fetch data — values from URL params are validated by Zod at runtime
  const data = await getCatalogData({
    island,
    municipality,
    propertyType: propertyType as Parameters<typeof getCatalogData>[0]["propertyType"],
    operation: operation as Parameters<typeof getCatalogData>[0]["operation"],
    priceMin,
    priceMax,
    bedrooms,
    bathrooms,
    amenities: amenities as Parameters<typeof getCatalogData>[0]["amenities"],
    constructionStatus: constructionStatus as Parameters<typeof getCatalogData>[0]["constructionStatus"],
    cursor,
    limit: 12,
    sort,
  });

  // Transform to CatalogItem[]
  const items: CatalogItem[] = data.items.map(toCatalogItem);

  // Current search string (for pagination href)
  const currentSearch = cursor ? undefined : buildSearchString(sp);

  return (
    <div className="min-h-screen">
      {/* Header band ------------------------------------------------------ */}
      <section className="bg-bg-canvas pb-10 pt-[120px]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 xl:px-14">
          <h1
            className={cn(
              "font-display text-[clamp(36px,4.8vw,64px)] font-normal leading-[1.05] tracking-[-0.035em]",
              "text-fg-default",
            )}
          >
            Promociones
          </h1>
          <p className="mt-4 max-w-[52ch] font-sans text-[19px] leading-[1.6] text-fg-muted">
            Explora nuestra selección de inmuebles en las Islas Canarias.
            Encuentra el espacio ideal para ti o tu negocio.
          </p>
        </div>
      </section>

      {/* Filter bar + catalog content ------------------------------------ */}
      <section className="bg-bg-canvas pb-20">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 xl:px-14">
          <Suspense fallback={<FilterBarSkeleton />}>
            <FilterBar initialFilters={initialFilters} />
          </Suspense>

          <div className="mt-8">
            {items.length > 0 ? (
              <CatalogGrid
                items={items}
                total={data.total}
                nextCursor={data.nextCursor}
                currentSearch={currentSearch}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar skeleton (shown during suspense)
// ---------------------------------------------------------------------------

function FilterBarSkeleton() {
  return (
    <div className="rounded-surface border border-border-subtle bg-bg-surface p-inline-md pb-stack-sm">
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[50px] w-[140px] rounded-control" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSearchString(
  sp: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  // Exclude cursor from the current search string to avoid duplication
  for (const [key, value] of Object.entries(sp)) {
    if (key === "cursor") continue;
    if (typeof value === "string") {
      params.set(key, value);
    }
  }
  return params.toString();
}
