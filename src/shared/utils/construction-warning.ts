/**
 * Shared utility for computing construction status warnings.
 *
 * The rule (architecture.md §7.19): constructionStatus is authoritative.
 * The warning is non-blocking — the operator has the final word.
 *
 * Used by both the backoffice page component and the internal API route
 * to ensure consistent warning logic from a single source of truth.
 */

export interface ConstructionWarning {
  type: "CONSTRUCTION_WARNING";
  message: string;
  entregaEstimada: string;
}

/**
 * Computes a soft warning when construction_status contradicts
 * the entrega_estimada from the PLAZOS_GARANTIAS content block.
 */
export function computeConstructionWarning(
  constructionStatus: string | null,
  blockPayload: Record<string, unknown> | null,
): ConstructionWarning | null {
  if (!constructionStatus || !blockPayload?.entrega_estimada) return null;

  const rawDate = blockPayload.entrega_estimada;
  const dateStr = typeof rawDate === "string" ? rawDate : "";
  if (!dateStr) return null;

  const entregaEstimada = new Date(dateStr);
  if (Number.isNaN(entregaEstimada.getTime())) return null;

  const now = new Date();
  const formattedDate = entregaEstimada.toISOString().slice(0, 10);
  const isPast = entregaEstimada < now;
  const isFuture = entregaEstimada > now;

  if (constructionStatus === "ON_PLAN" && isPast) {
    return {
      type: "CONSTRUCTION_WARNING",
      message: `Marcado como sobre plano pero la fecha de entrega (${formattedDate}) ya ha pasado`,
      entregaEstimada: formattedDate,
    };
  }
  if (constructionStatus === "READY" && isFuture) {
    return {
      type: "CONSTRUCTION_WARNING",
      message: `Marcado como terminado pero la fecha de entrega (${formattedDate}) está en el futuro`,
      entregaEstimada: formattedDate,
    };
  }
  if (constructionStatus === "IN_CONSTRUCTION" && isPast) {
    return {
      type: "CONSTRUCTION_WARNING",
      message: `Marcado como en construcción pero la fecha de entrega (${formattedDate}) ya ha pasado`,
      entregaEstimada: formattedDate,
    };
  }
  return null;
}
