"use client";

import { useMemo } from "react";
import type { CatalogItem } from "@/features/catalog/components/PropertyCard";
import { PropertyCard } from "@/features/catalog/components/PropertyCard";
import { EmptyState } from "@/features/catalog/components/EmptyState";
import { useFavorites } from "./useFavorites";

export interface FavoritesViewProps {
  /** All published catalog items; filtered client-side by saved ids. */
  items: CatalogItem[];
}

/**
 * FavoritesView — renders the promociones the visitor has saved.
 *
 * Favorites are stored in the browser, so the server ships the full published
 * catalog and this client component filters it by the saved ids. With a small
 * catalog this is cheaper and simpler than a per-id fetch endpoint.
 */
export function FavoritesView({ items }: FavoritesViewProps) {
  const { ids, ready } = useFavorites();

  const saved = useMemo(
    () => items.filter((item) => ids.includes(item.id)),
    [items, ids],
  );

  // Avoid a hydration flash: render nothing meaningful until the client read.
  if (!ready) {
    return (
      <p className="py-20 text-center font-sans text-sm text-fg-subtle" aria-live="polite">
        Cargando tus favoritos…
      </p>
    );
  }

  if (saved.length === 0) {
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
        {saved.length === 1
          ? "1 inmueble guardado"
          : `${saved.length} inmuebles guardados`}
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {saved.map((item) => (
          <PropertyCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
