import { ContentHistoryViewSkeleton } from "@/features/contenidos/components/ContentHistoryView";

/**
 * Loading state for the block history page.
 *
 * Renders a skeleton matching the ContentHistoryView layout while the
 * server component fetches session data and queries the repository.
 */
export default function BlockHistoryLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-72 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
        <div className="h-4 w-32 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
      </div>

      {/* History skeleton */}
      <ContentHistoryViewSkeleton />
    </div>
  );
}
