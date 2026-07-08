import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InfoBarProps {
  promocion: PromocionDetail;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "Consultar";
  return new Intl.NumberFormat("es-ES", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatSurface(promocion: PromocionDetail): string {
  const areas = promocion.tipologias
    .map((t) => t.builtArea ?? t.usefulArea)
    .filter((a): a is number => a !== null && a !== undefined);
  if (areas.length === 0) return "—";
  const min = Math.min(...areas);
  const max = Math.max(...areas);
  if (min === max) return `${formatPrice(min)} m²`;
  return `${formatPrice(min)} – ${formatPrice(max)} m²`;
}

function formatBedrooms(promocion: PromocionDetail): string {
  const beds = promocion.tipologias
    .map((t) => t.bedrooms)
    .filter((b): b is number => b !== null && b !== undefined);
  if (beds.length === 0) return "—";
  const min = Math.min(...beds);
  const max = Math.max(...beds);
  if (min === max) return `${min}`;
  return `${min} – ${max}`;
}

function getDeliveryInfo(promocion: PromocionDetail): string {
  const plazosBlock = promocion.contentBlocks.find(
    (b) => b.blockType === "PLAZOS_GARANTIAS",
  );
  if (plazosBlock?.payload?.delivery) {
    return plazosBlock.payload.delivery as string;
  }
  if (promocion.constructionStatus === "READY") return "Inmediata";
  return "Consultar";
}

function getPricePerM2(promocion: PromocionDetail): string {
  const firstTipo = promocion.tipologias[0];
  if (!firstTipo) return "—";
  const price = firstTipo.referencePriceSale;
  const area = firstTipo.builtArea ?? firstTipo.usefulArea;
  if (price && area) {
    const perM2 = Math.round(price / area);
    const formatted = new Intl.NumberFormat("es-ES", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(perM2);
    return `${formatted} €/m²`;
  }
  return "—";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InfoBar({ promocion }: InfoBarProps) {
  const pricePerM2 = getPricePerM2(promocion);
  const surface = formatSurface(promocion);
  const bedrooms = formatBedrooms(promocion);
  const delivery = getDeliveryInfo(promocion);

  const items = [
    { label: "Precio/m²", value: pricePerM2 },
    { label: "Superficie", value: surface },
    { label: "Dormitorios", value: bedrooms },
    { label: "Entrega", value: delivery },
  ];

  return (
    <div className="bg-bg-surface">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 md:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={`flex flex-col items-center px-4 py-6 text-center md:px-8 md:py-8 ${
              index < items.length - 1
                ? "border-r border-border-default"
                : ""
            }`}
          >
            <span className="font-display italic text-[32px] font-normal tracking-[-0.02em] leading-tight text-fg-default">
              {item.value}
            </span>
            <span className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
