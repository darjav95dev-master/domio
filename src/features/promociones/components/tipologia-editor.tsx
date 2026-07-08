"use client";

import { useState } from "react";
import { cn } from "@/shared/utils/cn";
import { AMENITIES, ENERGY_CERTS } from "@/shared/constants/db-enums";
import { AMENITY_LABELS } from "@/shared/constants/domain-labels";
import {
  UnidadEditor,
  type UnidadEditorItem,
} from "./unidad-editor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TipologiaEditorItem {
  _tempId: string;
  name: string;
  usefulArea: number | null;
  builtArea: number | null;
  floors: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  yearBuilt: number | null;
  energyCert: string | null;
  referencePriceSale: number | null;
  referencePriceRent: number | null;
  communityFee: number | null;
  deposit: number | null;
  amenities: string[];
  unidades: UnidadEditorItem[];
}

export interface TipologiaEditorErrors {
  name?: string;
}

export interface TipologiaEditorProps {
  tipologias: TipologiaEditorItem[];
  errors?: Record<string, TipologiaEditorErrors>;
  onChange: (tipologias: TipologiaEditorItem[]) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENERGY_CERT_LABELS: Record<string, string> = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  F: "F",
  G: "G",
  EN_TRAMITE: "En trámite",
};

const LABEL_STYLE =
  "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle";

const SELECT_STYLE = "appearance-none cursor-pointer";

const INPUT_BASE =
  "rounded-control border bg-bg-surface px-4 py-2.5 font-sans text-sm text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tempIdCounter = 0;
function nextTempId(): string {
  tempIdCounter += 1;
  return `tipologia-temp-${tempIdCounter}-${Date.now()}`;
}

function defaultTipologia(): TipologiaEditorItem {
  return {
    _tempId: nextTempId(),
    name: "",
    usefulArea: null,
    builtArea: null,
    floors: null,
    bedrooms: null,
    bathrooms: null,
    yearBuilt: null,
    energyCert: null,
    referencePriceSale: null,
    referencePriceRent: null,
    communityFee: null,
    deposit: null,
    amenities: [],
    unidades: [],
  };
}

// ---------------------------------------------------------------------------
// Component sub: TipologiaCard
// ---------------------------------------------------------------------------

interface TipologiaCardProps {
  tipologia: TipologiaEditorItem;
  error?: TipologiaEditorErrors;
  index: number;
  onChange: (updated: TipologiaEditorItem) => void;
}

function TipologiaCard({
  tipologia,
  error,
  index,
  onChange,
}: TipologiaCardProps) {
  const [expanded, setExpanded] = useState(true);

  const updateField = <K extends keyof TipologiaEditorItem>(
    field: K,
    value: TipologiaEditorItem[K],
  ) => {
    onChange({ ...tipologia, [field]: value });
  };

  const handleNumberChange = (
    field: keyof TipologiaEditorItem,
    raw: string,
  ) => {
    const val = raw ? Number(raw) : null;
    updateField(field, val as TipologiaEditorItem[typeof field]);
  };

  const toggleAmenity = (amenity: string) => {
    const current = tipologia.amenities;
    const next = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    updateField("amenities", next);
  };

  return (
    <div className="rounded-card border border-border-default bg-bg-surface-sunken">
      {/* Header — collapse trigger */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center justify-between px-5 py-4 text-left",
          "transition-colors duration-standard ease-standard",
          "hover:bg-bg-surface",
        )}
        aria-expanded={expanded}
        aria-controls={`tipologia-body-${tipologia._tempId}`}
      >
        <span className="font-display text-base font-medium text-fg-default">
          {tipologia.name || `Tipología ${index + 1}`}
        </span>
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "transition-transform duration-deliberate ease-standard",
            expanded && "rotate-180",
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Body */}
      {expanded && (
        <div
          id={`tipologia-body-${tipologia._tempId}`}
          className="border-t border-border-default px-5 pb-5 pt-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Name */}
            <div className="lg:col-span-3">
              <div className="flex flex-col gap-stack-xs">
                <label
                  htmlFor={`tipologia-name-${tipologia._tempId}`}
                  className={LABEL_STYLE}
                >
                  Nombre
                </label>
                <input
                  id={`tipologia-name-${tipologia._tempId}`}
                  type="text"
                  value={tipologia.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Ej. Tipo A, 3 dormitorios"
                  aria-invalid={Boolean(error?.name)}
                  className={cn(
                    INPUT_BASE,
                    error?.name && "border-status-danger-default",
                  )}
                />
                {error?.name && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className="font-sans text-sm text-status-danger-default"
                  >
                    {error.name}
                  </p>
                )}
              </div>
            </div>

            {/* Useful area */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-useful-area-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Superficie útil (m²)
              </label>
              <input
                id={`tipologia-useful-area-${tipologia._tempId}`}
                type="number"
                min={0}
                value={tipologia.usefulArea ?? ""}
                onChange={(e) => handleNumberChange("usefulArea", e.target.value)}
                placeholder="Ej. 85"
                className={INPUT_BASE}
              />
            </div>

            {/* Built area */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-built-area-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Superficie construida (m²)
              </label>
              <input
                id={`tipologia-built-area-${tipologia._tempId}`}
                type="number"
                min={0}
                value={tipologia.builtArea ?? ""}
                onChange={(e) => handleNumberChange("builtArea", e.target.value)}
                placeholder="Ej. 100"
                className={INPUT_BASE}
              />
            </div>

            {/* Bedrooms */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-bedrooms-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Dormitorios
              </label>
              <input
                id={`tipologia-bedrooms-${tipologia._tempId}`}
                type="number"
                min={0}
                max={10}
                value={tipologia.bedrooms ?? ""}
                onChange={(e) => handleNumberChange("bedrooms", e.target.value)}
                placeholder="Ej. 3"
                className={INPUT_BASE}
              />
            </div>

            {/* Bathrooms */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-bathrooms-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Baños
              </label>
              <input
                id={`tipologia-bathrooms-${tipologia._tempId}`}
                type="number"
                min={0}
                max={10}
                value={tipologia.bathrooms ?? ""}
                onChange={(e) => handleNumberChange("bathrooms", e.target.value)}
                placeholder="Ej. 2"
                className={INPUT_BASE}
              />
            </div>

            {/* Floors */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-floors-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Plantas
              </label>
              <input
                id={`tipologia-floors-${tipologia._tempId}`}
                type="number"
                min={0}
                value={tipologia.floors ?? ""}
                onChange={(e) => handleNumberChange("floors", e.target.value)}
                placeholder="Ej. 1"
                className={INPUT_BASE}
              />
            </div>

            {/* Year built */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-year-built-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Año de construcción
              </label>
              <input
                id={`tipologia-year-built-${tipologia._tempId}`}
                type="number"
                min={1800}
                max={2100}
                value={tipologia.yearBuilt ?? ""}
                onChange={(e) => handleNumberChange("yearBuilt", e.target.value)}
                placeholder="Ej. 2024"
                className={INPUT_BASE}
              />
            </div>

            {/* Energy cert */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-energy-cert-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Certificado energético
              </label>
              <select
                id={`tipologia-energy-cert-${tipologia._tempId}`}
                value={tipologia.energyCert ?? ""}
                onChange={(e) =>
                  updateField("energyCert", e.target.value || null)
                }
                className={cn(INPUT_BASE, SELECT_STYLE)}
              >
                <option value="">Seleccionar…</option>
                {ENERGY_CERTS.map((cert) => (
                  <option key={cert} value={cert}>
                    {ENERGY_CERT_LABELS[cert]}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference price sale */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-price-sale-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Precio de venta (€)
              </label>
              <input
                id={`tipologia-price-sale-${tipologia._tempId}`}
                type="number"
                min={0}
                value={tipologia.referencePriceSale ?? ""}
                onChange={(e) =>
                  handleNumberChange("referencePriceSale", e.target.value)
                }
                placeholder="Ej. 250000"
                className={INPUT_BASE}
              />
            </div>

            {/* Reference price rent */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-price-rent-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Precio de alquiler (€/mes)
              </label>
              <input
                id={`tipologia-price-rent-${tipologia._tempId}`}
                type="number"
                min={0}
                value={tipologia.referencePriceRent ?? ""}
                onChange={(e) =>
                  handleNumberChange("referencePriceRent", e.target.value)
                }
                placeholder="Ej. 1200"
                className={INPUT_BASE}
              />
            </div>

            {/* Community fee */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-community-fee-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Gastos de comunidad (€/mes)
              </label>
              <input
                id={`tipologia-community-fee-${tipologia._tempId}`}
                type="number"
                min={0}
                value={tipologia.communityFee ?? ""}
                onChange={(e) =>
                  handleNumberChange("communityFee", e.target.value)
                }
                placeholder="Ej. 80"
                className={INPUT_BASE}
              />
            </div>

            {/* Deposit */}
            <div className="flex flex-col gap-stack-xs">
              <label
                htmlFor={`tipologia-deposit-${tipologia._tempId}`}
                className={LABEL_STYLE}
              >
                Fianza (€)
              </label>
              <input
                id={`tipologia-deposit-${tipologia._tempId}`}
                type="number"
                min={0}
                value={tipologia.deposit ?? ""}
                onChange={(e) => handleNumberChange("deposit", e.target.value)}
                placeholder="Ej. 1200"
                className={INPUT_BASE}
              />
            </div>
          </div>

          {/* Amenities */}
          <div className="mt-5">
            <span className={cn(LABEL_STYLE, "mb-2 block")}>Servicios</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              {AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex cursor-pointer items-center gap-2 font-sans text-sm text-fg-default"
                >
                  <input
                    type="checkbox"
                    checked={tipologia.amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="size-4 rounded border-border-default text-accent-default focus:ring-accent-default"
                  />
                  {AMENITY_LABELS[amenity]}
                </label>
              ))}
            </div>
          </div>

          {/* UnidadEditor */}
          <div className="mt-5 border-t border-border-default pt-4">
            <UnidadEditor
              unidades={tipologia.unidades}
              onChange={(unidades) => updateField("unidades", unidades)}
              labelPrefix={tipologia.name || `Tipología ${index + 1}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: TipologiaEditor
// ---------------------------------------------------------------------------

/**
 * TipologiaEditor — editor de tipologías de una promoción.
 *
 * Lista de tipologías con expand/collapse. Cada tipología tiene un
 * formulario completo para todos los campos de TipologiaSchema, y un
 * editor de unidades anidado (UnidadEditor).
 *
 * **A11y:**
 * - Cada tipología tiene `aria-expanded` en el botón de colapso.
 * - Todos los campos tienen `<label>` via `htmlFor`.
 * - Botones de eliminar con `aria-label`.
 */
export function TipologiaEditor({
  tipologias,
  errors = {},
  onChange,
}: TipologiaEditorProps) {
  const handleTipologiaChange = (
    tempId: string,
    updated: TipologiaEditorItem,
  ) => {
    onChange(tipologias.map((t) => (t._tempId === tempId ? updated : t)));
  };

  const handleRemove = (tempId: string) => {
    onChange(tipologias.filter((t) => t._tempId !== tempId));
  };

  const handleAdd = () => {
    onChange([...tipologias, defaultTipologia()]);
  };

  return (
    <section className="rounded-card border border-border-default bg-bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-fg-default">
          Tipologías
        </h3>
        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "rounded-pill border border-fg-default bg-transparent px-4 py-2",
            "font-sans text-sm font-medium text-fg-default",
            "transition-colors duration-deliberate ease-standard",
            "hover:bg-fg-default hover:text-bg-canvas",
          )}
        >
          + Añadir tipología
        </button>
      </div>

      {tipologias.length === 0 && (
        <p className="mt-4 font-sans text-sm text-fg-subtle">
          No hay tipologías. Añade la primera tipología para esta promoción.
        </p>
      )}

      {tipologias.length > 0 && (
        <div className="mt-4 space-y-4">
          {tipologias.map((tipologia, index) => (
            <div key={tipologia._tempId} className="relative">
              {/* Remove button */}
              <TipologiaCard
                tipologia={tipologia}
                error={errors[tipologia._tempId]}
                index={index}
                onChange={(updated) =>
                  handleTipologiaChange(tipologia._tempId, updated)
                }
              />
              <button
                type="button"
                aria-label={`Eliminar tipología ${tipologia.name || index + 1}`}
                onClick={() => handleRemove(tipologia._tempId)}
                className={cn(
                  "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full",
                  "text-fg-subtle transition-colors duration-standard ease-standard",
                  "hover:bg-status-danger-subtle hover:text-status-danger-default",
                )}
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
