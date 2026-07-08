import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockZonasComunesProps {
  block: PromocionContentBlock;
}

interface ZonaItem {
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a ZONAS_COMUNES content block.
 * Only rendered when kind='portfolio' (enforced by EditorialBlocks).
 */
export function BlockZonasComunes({ block }: BlockZonasComunesProps) {
  const items = block.payload?.items as ZonaItem[] | undefined;

  if (!items || items.length === 0) return null;

  return (
    <section aria-label="Zonas comunes" data-block-type="ZONAS_COMUNES">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-card border border-border-default bg-bg-surface p-5"
          >
            <h4 className="font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default">
              {item.name}
            </h4>
            {item.description && (
              <p className="mt-2 text-base leading-relaxed text-fg-muted">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
