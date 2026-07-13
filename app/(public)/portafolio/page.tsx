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

// Lee el catálogo (BBDD) en cada request; no se prerenderiza en build (sin DB).
export const dynamic = "force-dynamic";

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
      {/* Header band (centered, paper-2) --------------------------------- */}
      <section className="bg-bg-surface-sunken pb-16 pt-[104px]">
        <div className="mx-auto max-w-[1200px] px-6 text-center md:px-12">
          <span className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-terracota before:h-px before:w-[32px] before:bg-gradient-to-r before:from-terracota before:to-transparent before:content-['']">
            Nuestras promociones
          </span>
          <h1
            className={cn(
              "mx-auto mt-5 max-w-[18ch] font-display text-[clamp(36px,5vw,68px)] font-normal leading-[1.05] tracking-[-0.035em]",
              "text-fg-default",
            )}
          >
            Tu próxima casa te espera <em className="font-normal italic">aquí</em>.
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] font-sans text-[19px] leading-[1.6] text-fg-muted">
            Venta y alquiler de inmuebles en toda Canarias. Encuentra el tuyo.
          </p>

          {/* Integrated compact filter toolbar */}
          <div className="mt-10">
            <Suspense fallback={<FilterBarSkeleton />}>
              <FilterBar initialFilters={initialFilters} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Catalog content ------------------------------------------------- */}
      <section className="bg-bg-canvas pb-20 pt-12">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 xl:px-14">
          <div>
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
    <div className="mx-auto flex max-w-[940px] flex-wrap items-center justify-center gap-2.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[38px] w-[120px] rounded-pill" />
      ))}
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
