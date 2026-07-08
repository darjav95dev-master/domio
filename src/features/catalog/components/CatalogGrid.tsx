import Link from "next/link";
import type { CatalogItem } from "./PropertyCard";
import { PropertyCard } from "./PropertyCard";
import { Skeleton } from "@/shared/components/skeleton";
import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogGridProps {
  items: CatalogItem[];
  total: number;
  nextCursor: string | null;
  /** Current URL search params string (without `?`), used to build pagination href. */
  currentSearch?: string;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-surface bg-bg-surface shadow-[0_1px_2px_rgba(var(--shadow-tint),0.04)]">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="space-y-3 p-6">
        <Skeleton className="h-3 w-2/3 rounded" />
        <Skeleton className="h-5 w-full rounded" />
        <Skeleton className="h-4 w-1/3 rounded" />
        <div className="border-t border-border-default pt-4">
          <Skeleton className="h-3 w-1/4 rounded" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPaginationQuery(
  currentSearch: string,
  nextCursor: string,
): string {
  const base = currentSearch ? `${currentSearch}&` : "";
  return `${base}cursor=${encodeURIComponent(nextCursor)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogGrid({
  items,
  total,
  nextCursor,
  currentSearch = "",
  loading = false,
}: CatalogGridProps) {
  const hasItems = items.length > 0;
  const showSkeleton = loading && !hasItems;

  // Build pagination href: append cursor to existing search params
  const paginationHref = nextCursor
    ? `/portafolio?${buildPaginationQuery(currentSearch, nextCursor)}`
    : "";

  return (
    <section aria-label="Listado de propiedades">
      {/* Result count */}
      <p
        className="mb-6 font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle"
        aria-live="polite"
      >
        {total === 1
          ? `${total} inmueble encontrado`
          : `${total} inmuebles encontrados`}
      </p>

      {/* Skeleton state */}
      {showSkeleton && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Grid */}
      {hasItems && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <PropertyCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {nextCursor && !loading && (
        <div className="mt-10 flex justify-center">
          <Link
            href={paginationHref}
            className={cn(
              "inline-flex items-center gap-2 rounded-pill border-[1.5px] border-fg-default bg-transparent px-[26.5px] py-[13.5px]",
              "font-sans text-base font-medium tracking-[-0.005em] text-fg-default",
              "transition-all duration-deliberate ease-standard",
              "hover:bg-fg-default hover:text-bg-canvas",
              "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3",
            )}
          >
            Siguiente
          </Link>
        </div>
      )}
    </section>
  );
}
