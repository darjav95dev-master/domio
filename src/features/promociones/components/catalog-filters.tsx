"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/shared/utils/cn";
import {
  PROMOTION_STATUS_LABELS,
  CONSTRUCTION_STATUS_LABELS,
} from "@/shared/constants/domain-labels";
import { PROMOCION_STATUSES, CONSTRUCTION_STATUSES } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KIND_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "portfolio", label: "Portafolio" },
  { value: "external", label: "Captación externa" },
] as const;

const FILTER_FIELDS = [
  "status",
  "kind",
  "island",
  "municipality",
  "constructionStatus",
] as const;

/** Shared label style for all filter controls. */
const LABEL_STYLE =
  "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle";

/** Shared class for native select elements. */
const SELECT_STYLE = "appearance-none cursor-pointer";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CatalogFilters — barra de filtros para el listado de promociones.
 *
 * Client component que lee los filtros actuales de la URL y los actualiza
 * mediante `router.push()` al enviar el formulario.
 *
 * **A11y:**
 * - Cada control tiene un `<label>` asociado vía `htmlFor`.
 * - El formulario tiene `role="search"`.
 * - El contador de filtros activos se anuncia con `aria-live="polite"`.
 * - `focus-visible` gestionado por el `:focus-visible` global.
 */
export function CatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Read current filter values from URL ────────────────────────────────
  const currentStatus = searchParams.get("status") ?? "";
  const currentKind = searchParams.get("kind") ?? "";
  const currentIsland = searchParams.get("island") ?? "";
  const currentMunicipality = searchParams.get("municipality") ?? "";
  const currentConstructionStatus =
    searchParams.get("constructionStatus") ?? "";

  // Count active filters for a11y announcement
  const activeFilterCount = [
    currentStatus,
    currentKind,
    currentIsland,
    currentMunicipality,
    currentConstructionStatus,
  ].filter(Boolean).length;

  // ── Submit handler ──────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const params = new URLSearchParams();

      // Only include non-empty values
      for (const field of FILTER_FIELDS) {
        const value = formData.get(field)?.toString().trim() ?? "";
        if (value) {
          params.set(field, value);
        }
      }

      // Always reset to page 1 when filters change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname],
  );

  // ── Clear handler ───────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  // ── Shared input class ──────────────────────────────────────────────────

  const inputBase =
    "rounded-control border border-border-default bg-bg-surface px-4 py-2.5 font-sans text-sm text-fg-default transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default placeholder:text-fg-subtle";

  // ── A11y message ────────────────────────────────────────────────────────

  const pluralS = activeFilterCount === 1 ? "" : "s";
  const a11yMessage =
    activeFilterCount > 0
      ? `${activeFilterCount} filtro${pluralS} activo${pluralS}`
      : "Ningún filtro activo";

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <form
      role="search"
      aria-label="Filtros del catálogo"
      onSubmit={handleSubmit}
      className="rounded-card border border-border-subtle bg-bg-surface p-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Status */}
        <div className="flex flex-col gap-stack-xs">
          <label
            htmlFor="filter-status"
            className={LABEL_STYLE}
          >
            Estado
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={currentStatus}
            className={cn(inputBase, SELECT_STYLE)}
          >
            <option value="">Todos</option>
            {PROMOCION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROMOTION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Kind */}
        <div className="flex flex-col gap-stack-xs">
          <label
            htmlFor="filter-kind"
            className={LABEL_STYLE}
          >
            Tipo
          </label>
          <select
            id="filter-kind"
            name="kind"
            defaultValue={currentKind}
            className={cn(inputBase, SELECT_STYLE)}
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Island */}
        <div className="flex flex-col gap-stack-xs">
          <label
            htmlFor="filter-island"
            className={LABEL_STYLE}
          >
            Isla
          </label>
          <input
            id="filter-island"
            name="island"
            type="text"
            defaultValue={currentIsland}
            placeholder="Ej. Gran Canaria"
            className={inputBase}
          />
        </div>

        {/* Municipality */}
        <div className="flex flex-col gap-stack-xs">
          <label
            htmlFor="filter-municipality"
            className={LABEL_STYLE}
          >
            Municipio
          </label>
          <input
            id="filter-municipality"
            name="municipality"
            type="text"
            defaultValue={currentMunicipality}
            placeholder="Ej. Las Palmas"
            className={inputBase}
          />
        </div>

        {/* Construction Status */}
        <div className="flex flex-col gap-stack-xs">
          <label
            htmlFor="filter-constructionStatus"
            className={LABEL_STYLE}
          >
            Estado de obra
          </label>
          <select
            id="filter-constructionStatus"
            name="constructionStatus"
            defaultValue={currentConstructionStatus}
            className={cn(inputBase, SELECT_STYLE)}
          >
            <option value="">Todos</option>
            {CONSTRUCTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CONSTRUCTION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          className={cn(
            "rounded-pill border-[1.5px] border-fg-default bg-transparent px-5 py-2",
            "font-sans text-sm font-medium text-fg-default",
            "transition-colors duration-deliberate ease-standard",
            "hover:bg-fg-default hover:text-bg-canvas",
            "focus-visible:outline-offset-[-2px]",
          )}
        >
          Aplicar filtros
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              "font-sans text-sm text-accent-default underline underline-offset-4",
              "transition-colors duration-standard ease-standard",
              "hover:text-accent-hover",
            )}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* A11y: announce active filters */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {a11yMessage}
      </div>
    </form>
  );
}
