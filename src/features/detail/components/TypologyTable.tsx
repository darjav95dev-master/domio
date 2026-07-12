import { getPublicMediaUrl } from "@/infrastructure/media/public-url";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TypologyTableProps {
  promocion: PromocionDetail;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "Consultar";
  const formatted = new Intl.NumberFormat("es-ES", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(price);
  return `${formatted} €`;
}

function formatSurface(area: number | null): string {
  if (area === null || area === undefined) return "—";
  return `${area} m²`;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "Disponible";
    case "RESERVED":
      return "Reservada";
    case "SOLD":
      return "Vendida";
    case "RENTED":
      return "Alquilada";
    default:
      return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "text-status-success-default";
    case "RESERVED":
      return "text-status-warning-default";
    case "SOLD":
    case "RENTED":
      return "text-fg-subtle";
    default:
      return "text-fg-subtle";
  }
}

function getPlanAsset(
  planAssetId: string | null,
  promocion: PromocionDetail,
): { r2Key: string; altText: string } | null {
  if (!planAssetId) return null;
  const asset = promocion.mediaAssets.find((a) => a.id === planAssetId);
  if (asset) {
    return { r2Key: asset.r2Key, altText: asset.altText };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a table of tipologías with name, superficie, dormitorios, baños,
 * precio, estado, and planos in a separate column.
 */
export function TypologyTable({ promocion }: TypologyTableProps) {
  const { tipologias } = promocion;

  if (!tipologias || tipologias.length === 0) return null;

  return (
    <section aria-label="Tipologías disponibles" data-testid="typology-table">
      <div className="mx-auto max-w-[1080px] overflow-x-auto rounded-[14px] border border-border-default bg-bg-surface">
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          {/* Head */}
          <thead>
            <tr className="border-b border-border-default bg-bg-surface-sunken font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
              <th scope="col" className="whitespace-nowrap px-6 py-[18px] text-left">Tipología</th>
              <th scope="col" className="whitespace-nowrap px-6 py-[18px] text-left">Dorm.</th>
              <th scope="col" className="whitespace-nowrap px-6 py-[18px] text-left">Superficie</th>
              <th scope="col" className="whitespace-nowrap px-6 py-[18px] text-left">Baños</th>
              <th scope="col" className="whitespace-nowrap px-6 py-[18px] text-left">Estado</th>
              <th scope="col" className="whitespace-nowrap px-6 py-[18px] text-left">Desde</th>
              <th scope="col" className="whitespace-nowrap px-6 py-[18px] text-right">Plano</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {tipologias.map((tipo, index) => {
              const plan = getPlanAsset(tipo.planAssetId, promocion);
              const isLast = index === tipologias.length - 1;
              const rowBorder = isLast ? "" : "border-b border-border-subtle";
              return (
                <tr
                  key={tipo.id}
                  className="transition-colors duration-150 hover:bg-[#ede5d2]"
                >
                  <td className={`whitespace-nowrap px-6 py-[18px] font-display text-[18px] font-normal tracking-[-0.01em] text-fg-default ${rowBorder}`}>
                    {tipo.name}
                  </td>
                  <td className={`px-6 py-[18px] text-fg-muted ${rowBorder}`}>
                    {tipo.bedrooms ?? "—"}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-[18px] tabular-nums text-fg-muted ${rowBorder}`}>
                    {formatSurface(tipo.builtArea ?? tipo.usefulArea)}
                  </td>
                  <td className={`px-6 py-[18px] text-fg-muted ${rowBorder}`}>
                    {tipo.bathrooms ?? "—"}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-[18px] font-mono text-[11px] tracking-[0.04em] ${getStatusColor(tipo.unidades[0]?.status ?? "AVAILABLE")} ${rowBorder}`}>
                    {getStatusLabel(tipo.unidades[0]?.status ?? "AVAILABLE")}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-[18px] font-display text-[18px] font-normal tabular-nums tracking-[-0.01em] text-fg-default ${rowBorder}`}>
                    {formatPrice(tipo.referencePriceSale ?? tipo.referencePriceRent)}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-[18px] text-right ${rowBorder}`}>
                    {plan ? (
                      <a
                        href={getPublicMediaUrl(plan.r2Key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-terracota transition-colors hover:text-accent-hover"
                      >
                        Ver plano →
                      </a>
                    ) : (
                      <span className="font-mono text-[10px] text-fg-subtle">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
