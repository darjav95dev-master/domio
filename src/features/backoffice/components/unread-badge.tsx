"use client";

import { Skeleton } from "@/shared/components/skeleton";
import { cn } from "@/shared/utils/cn";
import { useUnreadCount } from "@/features/leads/hooks/use-unread-count";

export interface UnreadBadgeProps {
  /** Polling interval in milliseconds. @default 30_000 */
  pollingInterval?: number;
}

/**
 * UnreadBadge — polls `/api/internal/leads/unread-count` every 30s
 * and displays a terracota pill with the unread count.
 */
export function UnreadBadge({ pollingInterval = 30_000 }: UnreadBadgeProps) {
  const count = useUnreadCount(pollingInterval);

  if (count === null) return <Skeleton className="h-5 min-w-5 rounded-full" />;
  if (count === 0) return null;

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Leads no leídos: ${count}`}
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-5 rounded-full bg-terracota px-2 py-0.5",
        "text-xs font-medium leading-none text-bone",
      )}
    >
      {count}
    </span>
  );
}
