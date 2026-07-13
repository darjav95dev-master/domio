import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import { PROMOTION_STATUS_COLORS } from "@/shared/constants/status-colors";
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  PROMOTION_STATUS_LABELS,
  KIND_LABELS,
} from "@/shared/constants/domain-labels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogListItem {
  id: string;
  name: string;
  propertyType: string | null;
  operation: string | null;
  status: string;
  kind: string;
  municipality: string | null;
  assignedAgentName: string | null;
}

export interface CatalogListProps {
  items: CatalogListItem[];
  total: number;
  page: number;
  limit: number;
  /** Current search params string (e.g. "?status=PUBLISHED&kind=portfolio") */
  currentParams: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kindLabel(kind: string): string {
  return KIND_LABELS[kind as keyof typeof KIND_LABELS] ?? kind;
}

function operationLabel(op: string | null): string {
  if (!op) return "—";
  return OPERATION_TYPE_LABELS[op as keyof typeof OPERATION_TYPE_LABELS] ?? op;
}

function propertyTypeLabel(pt: string | null): string {
  if (!pt) return "—";
  return PROPERTY_TYPE_LABELS[pt as keyof typeof PROPERTY_TYPE_LABELS] ?? pt;
}

function statusLabel(status: string): string {
  return (
    PROMOTION_STATUS_LABELS[status as keyof typeof PROMOTION_STATUS_LABELS] ??
    status
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default">
        No hay promociones con los filtros seleccionados
      </p>
      <p className="max-w-[52ch] font-sans text-base leading-[1.55] text-fg-muted">
        Intenta ajustar los filtros o crea una nueva promoción para empezar a
        construir tu catálogo.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

interface PaginationProps {
  total: number;
  page: number;
  limit: number;
  currentParams: string;
}

function Pagination({ total, page, limit, currentParams }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  // Build prev/next URLs preserving current filter params
  const baseParams = new URLSearchParams(currentParams.replace(/^\?/, ""));

  const prevParams = new URLSearchParams(baseParams);
  prevParams.set("page", String(page - 1));
  const prevHref = `?${prevParams.toString()}`;

  const nextParams = new URLSearchParams(baseParams);
  nextParams.set("page", String(page + 1));
  const nextHref = `?${nextParams.toString()}`;

  return (
    <nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-4">
      <Link
        href={prevHref}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn(
          "rounded-pill border-[1.5px] px-4 py-2 font-sans text-sm font-medium transition-colors duration-deliberate ease-standard",
          page <= 1
            ? "pointer-events-none border-border-default text-fg-subtle opacity-50"
            : "border-fg-default text-fg-default hover:bg-fg-default hover:text-bg-canvas",
        )}
      >
        Anterior
      </Link>

      <span className="font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle">
        Página {page} de {totalPages}
      </span>

      <Link
        href={nextHref}
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        className={cn(
          "rounded-pill border-[1.5px] px-4 py-2 font-sans text-sm font-medium transition-colors duration-deliberate ease-standard",
          page >= totalPages
            ? "pointer-events-none border-border-default text-fg-subtle opacity-50"
            : "border-fg-default text-fg-default hover:bg-fg-default hover:text-bg-canvas",
        )}
      >
        Siguiente
      </Link>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// CatalogList
// ---------------------------------------------------------------------------

/**
 * CatalogList — tabla de promociones con paginación y estados vacío.
 *
 * Server component (sin "use client"). Recibe los datos ya resueltos como
 * props y se encarga exclusivamente del renderizado.
 *
 * **A11y:**
 * - Tabla semántica con `<thead>` y `<th>`.
 * - Navegación de paginación con `<nav aria-label="Paginación">`.
 * - `aria-live="polite"` en el contador de resultados.
 * - Badges de estado con colores semánticos desde status-colors.ts.
 */
export function CatalogList({
  items,
  total,
  page,
  limit,
  currentParams,
}: CatalogListProps) {
  return (
    <section aria-label="Listado de promociones">
      {/* Result count */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="mb-4 font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle"
      >
        {total} resultado{total !== 1 ? "s" : ""}
      </p>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Table wrapper — horizontal scroll on mobile */}
          <div className="overflow-x-auto rounded-card border border-border-subtle">
            <table className="w-full border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-border-default bg-bg-surface-sunken">
                  <th
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                  >
                    Tipo
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                  >
                    Operación
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                  >
                    Tipo
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                  >
                    Municipio
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                  >
                    Agente
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-border-default transition-colors duration-standard ease-standard last:border-b-0 hover:bg-bg-surface",
                    )}
                  >
                    {/* Name — link to edit */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/panel/catalogo/${item.id}`}
                        className="font-medium text-fg-default underline underline-offset-4 transition-colors duration-standard ease-standard hover:text-accent-default"
                      >
                        {item.name}
                      </Link>
                    </td>

                    {/* Property Type */}
                    <td className="px-4 py-3 text-fg-muted">
                      {propertyTypeLabel(item.propertyType)}
                    </td>

                    {/* Operation */}
                    <td className="px-4 py-3 text-fg-muted">
                      {operationLabel(item.operation)}
                    </td>

                    {/* Status — colored badge */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-pill border px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em]",
                          PROMOTION_STATUS_COLORS[item.status] ??
                            "bg-status-info-subtle text-status-info-default border-status-info-default",
                        )}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>

                    {/* Kind */}
                    <td className="px-4 py-3 text-fg-muted">
                      {kindLabel(item.kind)}
                    </td>

                    {/* Municipality */}
                    <td className="px-4 py-3 text-fg-muted">
                      {item.municipality ?? "—"}
                    </td>

                    {/* Assigned Agent */}
                    <td className="px-4 py-3 text-fg-muted">
                      {item.assignedAgentName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            total={total}
            page={page}
            limit={limit}
            currentParams={currentParams}
          />
        </>
      )}
    </section>
  );
}
