"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Polls /api/internal/leads/unread-count and refreshes immediately
 * when a "lead:read" event is dispatched (e.g. on opening a lead detail).
 *
 * Returns null while loading, or the current unread count.
 */
export function useUnreadCount(pollingInterval = 30_000): number | null {
  const [count, setCount] = useState<number | null>(null);

  const fetchCount = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/internal/leads/unread-count", { signal });
      if (!res.ok) return;
      const data: unknown = await res.json();
      const raw =
        typeof data === "object" && data !== null
          ? (data as Record<string, unknown>).count
          : undefined;
      if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
        setCount(raw);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchCount(ac.signal);
    const intervalId = setInterval(() => fetchCount(ac.signal), pollingInterval);
    const onLeadRead = () => { fetchCount(ac.signal); };
    window.addEventListener("lead:read", onLeadRead);
    return () => {
      ac.abort();
      clearInterval(intervalId);
      window.removeEventListener("lead:read", onLeadRead);
    };
  }, [fetchCount, pollingInterval]);

  return count;
}
