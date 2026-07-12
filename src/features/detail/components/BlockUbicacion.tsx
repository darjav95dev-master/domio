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
      <div className="overflow-hidden rounded-[14px] border border-border-default bg-bg-surface">
        <div className="border-b border-border-subtle px-7 py-5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            Servicios cercanos
          </p>
        </div>
        <ul>
          {items.map((item, index) => (
            <li
              key={index}
              className={`flex items-center justify-between gap-6 px-7 py-[18px] ${
                index < items.length - 1 ? "border-b border-border-subtle" : ""
              }`}
            >
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
                {item.service}
              </span>
              <span className="font-display text-[18px] font-normal tabular-nums tracking-[-0.01em] text-fg-default">
                {item.distance}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
