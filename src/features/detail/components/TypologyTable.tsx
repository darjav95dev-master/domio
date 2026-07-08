import { MediaImage } from "@/shared/components/media-image";
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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Head */}
          <thead>
            <tr className="border-b border-border-default font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
              <th scope="col" className="px-4 py-3 text-left">Nombre</th>
              <th scope="col" className="px-4 py-3 text-right">Superficie</th>
              <th scope="col" className="px-4 py-3 text-right">Dorm.</th>
              <th scope="col" className="px-4 py-3 text-right">Baños</th>
              <th scope="col" className="px-4 py-3 text-right">Precio</th>
              <th scope="col" className="px-4 py-3 text-left">Estado</th>
              <th scope="col" className="px-4 py-3 text-center">Plano</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {tipologias.map((tipo, index) => {
              const plan = getPlanAsset(tipo.planAssetId, promocion);
              return (
                <tr
                  key={tipo.id}
                  className={`border-b border-border-default ${
                    index % 2 === 0 ? "bg-bg-surface" : "bg-bg-canvas"
                  }`}
                >
                  <td className="px-4 py-4 font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default">
                    {tipo.name}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-default">
                    {formatSurface(tipo.builtArea ?? tipo.usefulArea)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-muted">
                    {tipo.bedrooms ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-muted">
                    {tipo.bathrooms ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-[11px] font-semibold tabular-nums text-fg-default">
                    {formatPrice(tipo.referencePriceSale ?? tipo.referencePriceRent)}
                  </td>
                  <td className={`px-4 py-4 font-mono text-[11px] tracking-[0.04em] ${getStatusColor(tipo.unidades[0]?.status ?? "AVAILABLE")}`}>
                    {getStatusLabel(tipo.unidades[0]?.status ?? "AVAILABLE")}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {plan ? (
                      <div className="relative mx-auto h-16 w-24 overflow-hidden rounded-control">
                        <MediaImage
                          alt={plan.altText}
                          src={plan.r2Key}
                          fill
                          sizes="96px"
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-fg-subtle">
                        —
                      </span>
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
