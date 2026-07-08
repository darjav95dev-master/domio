import { Skeleton } from "@/shared/components/skeleton";

/**
 * Loading state for the contenidos page list.
 *
 * Renders a skeleton grid while the server component loads.
 */
export default function ContenidosLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <Skeleton className="h-9 w-64" />

      {/* Description skeleton */}
      <Skeleton className="h-5 w-96" />

      {/* Grid of page cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-card" />
        ))}
      </div>
    </div>
  );
}
