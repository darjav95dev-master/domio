import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  CONSTRUCTION_STATUS_LABELS,
} from "@/shared/constants/domain-labels";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectInfoTableProps {
  promocion: PromocionDetail;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ProjectInfoTable — the "Información del proyecto" info-table from the
 * CoviCanarias reference, adapted to a real-estate promotion (not a
 * cooperative): operation, property type, construction status, delivery,
 * location and energy rating. Rows are derived from the promotion, so any
 * inmueble renders whatever data it has.
 */
export function ProjectInfoTable({ promocion }: ProjectInfoTableProps) {
  const operationLabel =
    promocion.operation &&
    OPERATION_TYPE_LABELS[promocion.operation as keyof typeof OPERATION_TYPE_LABELS];
  const propertyTypeLabel =
    promocion.propertyType &&
    PROPERTY_TYPE_LABELS[promocion.propertyType as keyof typeof PROPERTY_TYPE_LABELS];
  const constructionLabel =
    promocion.constructionStatus &&
    CONSTRUCTION_STATUS_LABELS[
      promocion.constructionStatus as keyof typeof CONSTRUCTION_STATUS_LABELS
    ];

  const energyCerts = Array.from(
    new Set(
      promocion.tipologias
        .map((t) => t.energyCert)
        .filter((c): c is string => Boolean(c)),
    ),
  );

  const location = [promocion.municipality, promocion.island]
    .filter(Boolean)
    .join(", ");

  const rows: Array<{ label: string; value: string }> = [
    operationLabel && { label: "Operación", value: operationLabel },
    propertyTypeLabel && { label: "Tipo de inmueble", value: propertyTypeLabel },
    constructionLabel && { label: "Estado", value: constructionLabel },
    location && { label: "Ubicación", value: location },
    energyCerts.length > 0 && {
      label: "Calificación energética",
      value: energyCerts.join(" · "),
    },
    { label: "Referencia", value: (promocion.slug ?? promocion.id).toUpperCase() },
  ].filter((r): r is { label: string; value: string } => Boolean(r));

  return (
    <div className="mx-auto max-w-[880px] overflow-hidden rounded-[14px] border border-border-default bg-bg-surface">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`flex items-center justify-between gap-6 px-7 py-[18px] ${
            index < rows.length - 1 ? "border-b border-border-subtle" : ""
          }`}
        >
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            {row.label}
          </span>
          <span className="text-right font-display text-[18px] font-normal tracking-[-0.01em] text-fg-default">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
