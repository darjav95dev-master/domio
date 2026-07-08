"use client";

import type { ChangeEvent } from "react";
import { useFilters } from "@/features/catalog/hooks/useFilters";
import { cn } from "@/shared/utils/cn";
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  CONSTRUCTION_STATUS_LABELS,
  AMENITY_LABELS,
} from "@/shared/constants/domain-labels";
import {
  PROPERTY_TYPES,
  OPERATION_TYPES,
  CONSTRUCTION_STATUSES,
  AMENITIES,
} from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterBarProps {
  /** Initial filter values passed from the server. */
  initialFilters?: {
    island?: string;
    municipality?: string;
    propertyType?: string;
    operation?: string;
    priceMin?: number;
    priceMax?: number;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[];
    constructionStatus?: string;
  };
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const BEDROOM_OPTIONS = [
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

const BATHROOM_OPTIONS = [
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
];

const PRICE_OPTIONS = [
  { value: "50000", label: "50.000 €" },
  { value: "100000", label: "100.000 €" },
  { value: "150000", label: "150.000 €" },
  { value: "200000", label: "200.000 €" },
  { value: "300000", label: "300.000 €" },
  { value: "500000", label: "500.000 €" },
  { value: "750000", label: "750.000 €" },
  { value: "1000000", label: "1.000.000 €" },
];

const ISLAND_OPTIONS = [
  "Tenerife",
  "Gran Canaria",
  "Lanzarote",
  "Fuerteventura",
  "La Palma",
  "La Gomera",
  "El Hierro",
];

const MUNICIPALITY_OPTIONS = [
  "Santa Cruz de Tenerife",
  "San Cristóbal de La Laguna",
  "Adeje",
  "Arona",
  "La Orotava",
  "Puerto de la Cruz",
  "Los Cristianos",
  "Candelaria",
  "Tacoronte",
  "Güímar",
];

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

function propertyTypeLabel(value: string): string {
  return (
    PROPERTY_TYPE_LABELS[value as keyof typeof PROPERTY_TYPE_LABELS] ?? value
  );
}

function operationLabel(value: string): string {
  return (
    OPERATION_TYPE_LABELS[value as keyof typeof OPERATION_TYPE_LABELS] ?? value
  );
}

function statusLabel(value: string): string {
  return (
    CONSTRUCTION_STATUS_LABELS[
      value as keyof typeof CONSTRUCTION_STATUS_LABELS
    ] ?? value
  );
}

function amenityLabel(value: string): string {
  return AMENITY_LABELS[value as keyof typeof AMENITY_LABELS] ?? value;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FilterBar({ initialFilters }: FilterBarProps) {
  const { filters, setFilter, toggleAmenity, clearFilters } =
    useFilters();

  // Merge URL-derived filters with optional initialFilters (server-side)
  const currentIsland = filters.island ?? initialFilters?.island;
  const currentMunicipality = filters.municipality ?? initialFilters?.municipality;
  const currentPropertyType = filters.propertyType ?? initialFilters?.propertyType;
  const currentOperation = filters.operation ?? initialFilters?.operation;
  const currentPriceMin = filters.priceMin ?? initialFilters?.priceMin;
  const currentPriceMax = filters.priceMax ?? initialFilters?.priceMax;
  const currentBedrooms = filters.bedrooms ?? initialFilters?.bedrooms;
  const currentBathrooms = filters.bathrooms ?? initialFilters?.bathrooms;
  const currentAmenities = filters.amenities.length > 0
    ? filters.amenities
    : (initialFilters?.amenities ?? []);
  const currentStatus =
    filters.constructionStatus ?? initialFilters?.constructionStatus;

  // -- Handlers ---------------------------------------------------------------

  const handleSelect = (key: string) => (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilter(key as Parameters<typeof setFilter>[0], val || undefined);
  };

  const handlePrice = (key: "priceMin" | "priceMax") =>
    (e: ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setFilter(key, val ? Number(val) : undefined);
    };

  const handleAmenityToggle = (amenity: string) => () => {
    toggleAmenity(amenity);
  };

  // -- Compute active count from merged values --------------------------------
  const localActiveCount = [
    currentIsland,
    currentMunicipality,
    currentPropertyType,
    currentOperation,
    currentPriceMin,
    currentPriceMax,
    currentBedrooms,
    currentBathrooms,
    currentStatus,
    currentAmenities.length > 0 ? "amenities" : undefined,
  ].filter(Boolean).length;

  // -- Build active chips -----------------------------------------------------

  const activeChips: Array<{ key: string; label: string }> = [];
  if (currentIsland) activeChips.push({ key: "island", label: currentIsland });
  if (currentMunicipality)
    activeChips.push({ key: "municipality", label: currentMunicipality });
  if (currentPropertyType)
    activeChips.push({
      key: "propertyType",
      label: propertyTypeLabel(currentPropertyType),
    });
  if (currentOperation)
    activeChips.push({
      key: "operation",
      label: operationLabel(currentOperation),
    });
  if (currentStatus)
    activeChips.push({
      key: "constructionStatus",
      label: statusLabel(currentStatus),
    });

  // -- Shared select field class ---------------------------------------------

  const selectClass = cn(
    "w-full min-w-[140px] rounded-control border bg-bg-surface px-4 py-3",
    "font-sans text-base text-fg-default",
    "transition-colors duration-standard ease-standard",
    "hover:border-border-strong focus:border-accent-default",
    "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3",
  );

  // -- Render ---------------------------------------------------------------

  return (
    <form
      role="search"
      aria-label="Filtrar propiedades"
      onSubmit={(e) => e.preventDefault()}
      className={cn(
        "sticky top-0 z-sticky rounded-surface bg-bg-surface",
        "border border-border-subtle p-inline-md pb-stack-sm",
        "shadow-[0_1px_2px_rgba(var(--shadow-tint),0.04)]",
      )}
    >
      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Island */}
        <FieldWrapper label="Isla">
          <select
            aria-label="Isla"
            value={currentIsland ?? ""}
            onChange={handleSelect("island")}
            className={selectClass}
          >
            <option value="">Todas las islas</option>
            {ISLAND_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Municipality */}
        <FieldWrapper label="Municipio">
          <select
            aria-label="Municipio"
            value={currentMunicipality ?? ""}
            onChange={handleSelect("municipality")}
            className={selectClass}
          >
            <option value="">Todos los municipios</option>
            {MUNICIPALITY_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Property type */}
        <FieldWrapper label="Tipo">
          <select
            aria-label="Tipo"
            value={currentPropertyType ?? ""}
            onChange={handleSelect("propertyType")}
            className={selectClass}
          >
            <option value="">Todos los tipos</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {propertyTypeLabel(t)}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Operation */}
        <FieldWrapper label="Operación">
          <select
            aria-label="Operación"
            value={currentOperation ?? ""}
            onChange={handleSelect("operation")}
            className={selectClass}
          >
            <option value="">Todas</option>
            {OPERATION_TYPES.map((o) => (
              <option key={o} value={o}>
                {operationLabel(o)}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Price range */}
        <FieldWrapper label="Precio mín.">
          <select
            aria-label="Precio mín."
            value={currentPriceMin ?? ""}
            onChange={handlePrice("priceMin")}
            className={selectClass}
          >
            <option value="">Mínimo</option>
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldWrapper>

        <FieldWrapper label="Precio máx.">
          <select
            aria-label="Precio máx."
            value={currentPriceMax ?? ""}
            onChange={handlePrice("priceMax")}
            className={selectClass}
          >
            <option value="">Máximo</option>
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Bedrooms */}
        <FieldWrapper label="Dormitorios">
          <select
            aria-label="Dormitorios"
            value={currentBedrooms ?? ""}
            onChange={handleSelect("bedrooms")}
            className={selectClass}
          >
            <option value="">Cualquiera</option>
            {BEDROOM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Bathrooms */}
        <FieldWrapper label="Baños">
          <select
            aria-label="Baños"
            value={currentBathrooms ?? ""}
            onChange={handleSelect("bathrooms")}
            className={selectClass}
          >
            <option value="">Cualquiera</option>
            {BATHROOM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Construction status */}
        <FieldWrapper label="Estado de obra">
          <select
            aria-label="Estado de obra"
            value={currentStatus ?? ""}
            onChange={handleSelect("constructionStatus")}
            className={selectClass}
          >
            <option value="">Cualquiera</option>
            {CONSTRUCTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </FieldWrapper>
      </div>

      {/* Control row ---------------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {/* Amenities checkboxes */}
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
            Servicios
          </legend>
          <div className="flex flex-wrap gap-3">
            {AMENITIES.slice(0, 3).map((amenity) => (
              <label
                key={amenity}
                className="flex cursor-pointer items-center gap-2 font-sans text-sm text-fg-muted"
              >
                <input
                  type="checkbox"
                  checked={currentAmenities.includes(amenity)}
                  onChange={handleAmenityToggle(amenity)}
                  className="h-4 w-4 accent-accent-default"
                />
                {amenityLabel(amenity)}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Active filters count or clear button */}
        {localActiveCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              "ml-auto font-sans text-sm text-accent-default",
              "underline decoration-accent-default/30 decoration-1 underline-offset-2",
              "transition-colors duration-standard ease-standard",
              "hover:decoration-accent-default",
            )}
          >
            Limpiar filtros ({localActiveCount})
          </button>
        )}
      </div>

      {/* Active chips --------------------------------------------------------- */}
      {activeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className={cn(
                "inline-flex items-center gap-1 rounded-pill px-3 py-1",
                "border border-accent-default bg-accent-subtle",
                "font-sans text-sm text-accent-default",
              )}
            >
              {chip.label}
              <button
                type="button"
                onClick={() => setFilter(chip.key as Parameters<typeof setFilter>[0], undefined)}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none transition-colors hover:bg-accent-default/20"
                aria-label={`Quitar filtro ${chip.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

function FieldWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-stack-xs">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}
