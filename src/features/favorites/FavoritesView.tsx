"use client";

import { useEffect, useState } from "react";
import type { CatalogItem } from "@/features/catalog/components/PropertyCard";
import { PropertyCard } from "@/features/catalog/components/PropertyCard";
import { EmptyState } from "@/features/catalog/components/EmptyState";
import { useFavorites } from "./useFavorites";

/**
 * FavoritesView — renders the promociones the visitor has saved.
 *
 * Inverted flow: reads IDs from localStorage (via useFavorites) and fetches
 * only those records from /api/public/promociones?ids=.... This avoids loading
 * the full catalog on the server when the catalog exceeds ~100 items.
 */
export function FavoritesView() {
  const { ids, ready } = useFavorites();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (ids.length === 0) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = ids.join(",");
    fetch(`/api/public/promociones?ids=${encodeURIComponent(params)}`)
      .then((res) => res.json())
      .then((data: { items?: CatalogItem[] }) => {
        if (!cancelled) {
          setItems(data.items ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ids, ready]);

  // Avoid a hydration flash: render nothing meaningful until the client read.
  if (!ready || loading) {
    return (
      <p className="py-20 text-center font-sans text-sm text-fg-subtle" aria-live="polite">
        Cargando tus favoritos…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        eyebrow="FAVORITOS"
        message="Todavía no has guardado ningún inmueble."
        description="Pulsa el corazón en cualquier propiedad para guardarla aquí."
      />
    );
  }

  return (
    <section aria-label="Inmuebles guardados">
      <p
        className="mb-6 font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle"
        aria-live="polite"
      >
        {items.length === 1
          ? "1 inmueble guardado"
          : `${items.length} inmuebles guardados`}
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <PropertyCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
