"use client";

import { cn } from "@/shared/utils/cn";
import { MAP_PRIVACY_MODES } from "@/shared/constants/db-enums";
import { LABEL_STYLE } from "@/shared/styles/backoffice-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocationSectionValues {
  island: string | null;
  municipality: string | null;
  address: string | null;
  lng: number | null;
  lat: number | null;
  mapPrivacyMode: string;
}

export interface LocationSectionErrors {
  island?: string;
  municipality?: string;
  mapPrivacyMode?: string;
}

export interface LocationSectionProps {
  values: LocationSectionValues;
  errors?: LocationSectionErrors;
  onChange: (values: LocationSectionValues) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_BASE =
  "rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default";

const MAP_PRIVACY_LABELS: Record<string, string> = {
  EXACT: "Ubicación exacta",
  AREA: "Área aproximada",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PromocionSectionLocation — sección de ubicación de la promoción.
 *
 * Campos: isla, municipio, dirección, coordenadas (lng/lat), modo de
 * privacidad del mapa. Todos opcionales.
 *
 * **A11y:**
 * - `<label>` asociado vía `htmlFor`.
 * - Radio group con `role="radiogroup"` y `aria-label`.
 * - Coordenadas con `type="number"` y pasos apropiados.
 */
export function PromocionSectionLocation({
  values,
  errors = {},
  onChange,
}: LocationSectionProps) {
  const handleChange = (
    field: keyof LocationSectionValues,
    value: string | number | null,
  ) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <fieldset className="rounded-card border border-border-default bg-bg-surface p-6">
      <legend className="font-display text-lg font-semibold text-fg-default">
        Ubicación
      </legend>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Island */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-island" className={LABEL_STYLE}>
            Isla
          </label>
          <input
            id="promocion-island"
            type="text"
            value={values.island ?? ""}
            onChange={(e) => handleChange("island", e.target.value || null)}
            placeholder="Ej. Gran Canaria"
            className={INPUT_BASE}
          />
        </div>

        {/* Municipality */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-municipality" className={LABEL_STYLE}>
            Municipio
          </label>
          <input
            id="promocion-municipality"
            type="text"
            value={values.municipality ?? ""}
            onChange={(e) =>
              handleChange("municipality", e.target.value || null)
            }
            placeholder="Ej. Las Palmas"
            aria-invalid={Boolean(errors.municipality)}
            aria-describedby={
              errors.municipality ? "promocion-municipality-error" : undefined
            }
            className={cn(
              INPUT_BASE,
              errors.municipality && "border-status-danger-default",
            )}
          />
          {errors.municipality && (
            <p
              id="promocion-municipality-error"
              role="alert"
              aria-live="polite"
              className="font-sans text-sm text-status-danger-default"
            >
              {errors.municipality}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <div className="flex flex-col gap-stack-xs">
            <label htmlFor="promocion-address" className={LABEL_STYLE}>
              Dirección
            </label>
            <input
              id="promocion-address"
              type="text"
              value={values.address ?? ""}
              onChange={(e) => handleChange("address", e.target.value || null)}
              placeholder="Ej. Calle Ejemplo, 123"
              className={INPUT_BASE}
            />
          </div>
        </div>

        {/* Coordinates — lng */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-lng" className={LABEL_STYLE}>
            Longitud
          </label>
          <input
            id="promocion-lng"
            type="number"
            step="any"
            value={values.lng ?? ""}
            onChange={(e) => {
              const val = e.target.value
                ? Number.parseFloat(e.target.value)
                : null;
              handleChange("lng", val);
            }}
            placeholder="Ej. -16.2518"
            className={INPUT_BASE}
          />
        </div>

        {/* Coordinates — lat */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-lat" className={LABEL_STYLE}>
            Latitud
          </label>
          <input
            id="promocion-lat"
            type="number"
            step="any"
            value={values.lat ?? ""}
            onChange={(e) => {
              const val = e.target.value
                ? Number.parseFloat(e.target.value)
                : null;
              handleChange("lat", val);
            }}
            placeholder="Ej. 28.4636"
            className={INPUT_BASE}
          />
        </div>

        {/* Map Privacy Mode — radio group */}
        <div className="md:col-span-2">
          <div
            role="radiogroup"
            aria-label="Modo de privacidad del mapa"
            className="flex flex-col gap-stack-xs"
          >
            <span className={LABEL_STYLE}>Privacidad del mapa</span>
            <div className="flex flex-wrap gap-6">
              {MAP_PRIVACY_MODES.map((mode) => (
                <label
                  key={mode}
                  className="flex cursor-pointer items-center gap-2 font-sans text-sm text-fg-default"
                >
                  <input
                    type="radio"
                    name="mapPrivacyMode"
                    value={mode}
                    checked={values.mapPrivacyMode === mode}
                    onChange={(e) =>
                      handleChange("mapPrivacyMode", e.target.value)
                    }
                    className="size-4 accent-accent-default"
                  />
                  {MAP_PRIVACY_LABELS[mode]}
                </label>
              ))}
            </div>
          </div>
          {errors.mapPrivacyMode && (
            <p
              role="alert"
              aria-live="polite"
              className="mt-1 font-sans text-sm text-status-danger-default"
            >
              {errors.mapPrivacyMode}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}
