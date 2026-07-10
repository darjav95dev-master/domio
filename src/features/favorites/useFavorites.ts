"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "domio:favorites";
const CHANGE_EVENT = "domio:favorites-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  // Notify other useFavorites instances in this tab (storage event only
  // fires in *other* tabs).
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * useFavorites — client-side favorites backed by localStorage.
 *
 * No login exists on the public site, so favorites live in the browser.
 * All hook instances (cards, nav badge, /favoritos) stay in sync via a
 * custom event, and across tabs via the native `storage` event.
 *
 * `ready` is false until the first client read completes, so callers can
 * avoid a hydration mismatch by rendering the neutral state on the server.
 */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(read());
    setReady(true);
    const sync = () => setIds(read());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    write(next);
    setIds(next);
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, count: ids.length, ready, isFavorite, toggle };
}
