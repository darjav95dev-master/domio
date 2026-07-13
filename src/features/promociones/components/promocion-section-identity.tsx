"use client";

import { Input } from "@/shared/components/input";
import { cn } from "@/shared/utils/cn";
import { PROPERTY_TYPES, OPERATION_TYPES } from "@/shared/constants/db-enums";
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
} from "@/shared/constants/domain-labels";
import {
  LABEL_STYLE,
  SELECT_STYLE,
  ERROR_STYLE,
  DANGER_BORDER,
} from "@/shared/styles/backoffice-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentitySectionValues {
  name: string;
  propertyType: string | null;
  operation: string | null;
  kind: string;
}

export interface IdentitySectionErrors {
  name?: string;
  propertyType?: string;
  operation?: string;
  kind?: string;
}

export interface IdentitySectionProps {
  values: IdentitySectionValues;
  errors?: IdentitySectionErrors;
  onChange: (values: IdentitySectionValues) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "portfolio", label: "Portafolio" },
  { value: "external", label: "Captación externa" },
];

const INPUT_BASE =
  "rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PromocionSectionIdentity — sección de identidad de la promoción.
 *
 * Incluye campos: nombre, tipo de propiedad, operación y kind.
 * Todos los campos con validación en cliente vía errores.
 *
 * **A11y:**
 * - `<label>` asociado vía `htmlFor` en cada control.
 * - `aria-describedby` en inputs con error.
 * - `aria-invalid` en inputs con error.
 */
export function PromocionSectionIdentity({
  values,
  errors = {},
  onChange,
}: IdentitySectionProps) {
  const handleChange = <K extends keyof IdentitySectionValues>(
    field: K,
    value: IdentitySectionValues[K],
  ) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <fieldset className="rounded-card border border-border-default bg-bg-surface p-6">
      <legend className="font-display text-lg font-semibold text-fg-default">
        Identidad
      </legend>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Name */}
        <div className="md:col-span-2">
          <Input
            id="promocion-name"
            label="Nombre"
            value={values.name}
            error={errors.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Ej. Residencial Los Olivos"
            maxLength={200}
          />
        </div>

        {/* Property Type */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-property-type" className={LABEL_STYLE}>
            Tipo de propiedad
          </label>
          <select
            id="promocion-property-type"
            value={values.propertyType ?? ""}
            onChange={(e) =>
              handleChange(
                "propertyType",
                e.target.value || null,
              )
            }
            aria-invalid={Boolean(errors.propertyType)}
            aria-describedby={
              errors.propertyType ? "promocion-property-type-error" : undefined
            }
            className={cn(
              INPUT_BASE,
              SELECT_STYLE,
              errors.propertyType && DANGER_BORDER,
            )}
          >
            <option value="">Seleccionar…</option>
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {PROPERTY_TYPE_LABELS[pt]}
              </option>
            ))}
          </select>
          {errors.propertyType && (
            <p
              id="promocion-property-type-error"
              role="alert"
              aria-live="polite"
              className={ERROR_STYLE}
            >
              {errors.propertyType}
            </p>
          )}
        </div>

        {/* Operation */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-operation" className={LABEL_STYLE}>
            Operación
          </label>
          <select
            id="promocion-operation"
            value={values.operation ?? ""}
            onChange={(e) =>
              handleChange(
                "operation",
                e.target.value || null,
              )
            }
            aria-invalid={Boolean(errors.operation)}
            aria-describedby={
              errors.operation ? "promocion-operation-error" : undefined
            }
            className={cn(
              INPUT_BASE,
              SELECT_STYLE,
              errors.operation && DANGER_BORDER,
            )}
          >
            <option value="">Seleccionar…</option>
            {OPERATION_TYPES.map((op) => (
              <option key={op} value={op}>
                {OPERATION_TYPE_LABELS[op]}
              </option>
            ))}
          </select>
          {errors.operation && (
            <p
              id="promocion-operation-error"
              role="alert"
              aria-live="polite"
              className={ERROR_STYLE}
            >
              {errors.operation}
            </p>
          )}
        </div>

        {/* Kind */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-kind" className={LABEL_STYLE}>
            Tipo de catálogo
          </label>
          <select
            id="promocion-kind"
            value={values.kind}
            onChange={(e) => handleChange("kind", e.target.value)}
            aria-invalid={Boolean(errors.kind)}
            aria-describedby={errors.kind ? "promocion-kind-error" : undefined}
            className={cn(
              INPUT_BASE,
              SELECT_STYLE,
              errors.kind && DANGER_BORDER,
            )}
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.kind && (
            <p
              id="promocion-kind-error"
              role="alert"
              aria-live="polite"
              className={ERROR_STYLE}
            >
              {errors.kind}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}
