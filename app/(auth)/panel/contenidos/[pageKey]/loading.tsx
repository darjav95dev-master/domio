import { Skeleton } from "@/shared/components/skeleton";
import { ContentBlockEditorSkeleton } from "@/features/contenidos/components/ContentBlockEditor";

/**
 * Loading state for the page content editor.
 *
 * Renders a skeleton layout while the server component fetches blocks.
 * Uses the ContentBlockEditorSkeleton for individual block editors.
 */
export default function PageKeyContentLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Block skeletons */}
      <ContentBlockEditorSkeleton />
      <ContentBlockEditorSkeleton />
    </div>
  );
}
