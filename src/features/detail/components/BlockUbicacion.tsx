import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockUbicacionProps {
  block: PromocionContentBlock;
}

interface UbicacionItem {
  service: string;
  distance: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a UBICACION_SERVICIOS content block as a list of distances.
 */
export function BlockUbicacion({ block }: BlockUbicacionProps) {
  const items = block.payload?.items as UbicacionItem[] | undefined;

  if (!items || items.length === 0) return null;

  return (
    <section aria-label="Ubicación y servicios" data-block-type="UBICACION_SERVICIOS">
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-center justify-between rounded-card border border-border-default bg-bg-surface px-5 py-4"
          >
            <span className="text-base text-fg-default">{item.service}</span>
            <span className="font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle">
              {item.distance}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
