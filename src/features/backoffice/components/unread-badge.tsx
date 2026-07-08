"use client";

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/shared/components/skeleton";
import { cn } from "@/shared/utils/cn";

export interface UnreadBadgeProps {
  /**
   * Polling interval in milliseconds.
   * @default 30_000
   */
  pollingInterval?: number;
}

type BadgeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "zero" }
  | { status: "count"; count: number };

/**
 * UnreadBadge — polls `/api/internal/leads/unread-count` every 30s
 * and displays a terracota pill with the unread count.
 *
 * States:
 *   - loading → small Skeleton pill (role="status", aria-hidden="true")
 *   - count === 0 or error → renders nothing (return null)
 *   - count > 0 → terracota pill with `aria-live="polite"`
 *
 * @see spec.md §2.2 (Task T018)
 * @see design.md §13.5 — backoffice shell
 */
export function UnreadBadge({
  pollingInterval = 30_000,
}: UnreadBadgeProps) {
  const [state, setState] = useState<BadgeState>({ status: "loading" });

  const fetchCount = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/internal/leads/unread-count", {
        signal,
      });

      if (!res.ok) {
        setState({ status: "error" });
        return;
      }

      const data: unknown = await res.json();
      const rawCount: unknown =
        typeof data === "object" && data !== null
          ? (data as Record<string, unknown>).count
          : undefined;

      if (
        typeof rawCount !== "number" ||
        !Number.isFinite(rawCount) ||
        rawCount < 0
      ) {
        setState({ status: "error" });
        return;
      }

      const count = rawCount;

      setState(
        count > 0 ? { status: "count", count } : { status: "zero" },
      );
    } catch (err) {
      // AbortError is expected on unmount — ignore silently
      if (err instanceof DOMException && err.name === "AbortError") return;

      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    // Initial fetch
    fetchCount(abortController.signal);

    // Polling interval
    const intervalId = setInterval(() => {
      fetchCount(abortController.signal);
    }, pollingInterval);

    return () => {
      abortController.abort();
      clearInterval(intervalId);
    };
  }, [fetchCount, pollingInterval]);

  // ── Loading state (skeleton pill) ────────────────────────────────────
  if (state.status === "loading") {
    return (
      <Skeleton className="h-5 min-w-5 rounded-full" />
    );
  }

  // ── Zero or error — render nothing ──────────────────────────────────
  if (state.status === "zero" || state.status === "error") {
    return null;
  }

  // ── Count > 0 — terracota pill ──────────────────────────────────────
  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Leads no leídos: ${state.count}`}
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-5 rounded-full bg-terracota px-2 py-0.5",
        "text-xs font-medium leading-none text-bone",
      )}
    >
      {state.count}
    </span>
  );
}
