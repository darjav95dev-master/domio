import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntroStatsProps {
  promocion: PromocionDetail;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bedroomsRange(promocion: PromocionDetail): string {
  const beds = promocion.tipologias
    .map((t) => t.bedrooms)
    .filter((b): b is number => b !== null && b !== undefined);
  if (beds.length === 0) return "—";
  const min = Math.min(...beds);
  const max = Math.max(...beds);
  return min === max ? `${min}` : `${min}–${max}`;
}

function deliveryValue(promocion: PromocionDetail): string {
  const plazos = promocion.contentBlocks.find(
    (b) => b.blockType === "PLAZOS_GARANTIAS",
  );
  if (plazos?.payload?.delivery) return plazos.payload.delivery as string;
  if (promocion.constructionStatus === "READY") return "Inmediata";
  return "Consultar";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * IntroStats — the three-up stat block from the reference intro section
 * ("Tipologías / Dormitorios / Entrega"), derived from the promotion.
 */
export function IntroStats({ promocion }: IntroStatsProps) {
  const stats = [
    { value: `${promocion.tipologias.length}`, label: "Tipologías" },
    { value: bedroomsRange(promocion), label: "Dormitorios" },
    { value: deliveryValue(promocion), label: "Entrega prevista" },
  ];

  return (
    <div className="mx-auto grid max-w-[880px] grid-cols-1 gap-8 text-center sm:grid-cols-3 md:gap-12">
      {stats.map((stat) => (
        <div key={stat.label}>
          <span className="block font-display text-[44px] font-normal leading-none tracking-[-0.03em] text-fg-default md:text-[64px]">
            {stat.value}
          </span>
          <span className="mt-2 block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
