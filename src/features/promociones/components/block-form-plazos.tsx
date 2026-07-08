"use client";

import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Shared CSS class strings
// ---------------------------------------------------------------------------

const LABEL_CLS =
  "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle";
const ERROR_CLS = "font-sans text-sm text-status-danger-default";
const INPUT_BASE =
  "rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default";
const INPUT_PLACEHOLDER = " placeholder:text-fg-subtle";
const INPUT_TRANSITION = " transition-colors duration-standard ease-standard";
const INPUT_HOVER = " hover:border-border-strong";
const INPUT_FOCUS =
  " focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2";
const INPUT_DISABLED = " cursor-not-allowed opacity-60";

const INPUT_CLS =
  INPUT_BASE + INPUT_PLACEHOLDER + INPUT_TRANSITION + INPUT_HOVER + INPUT_FOCUS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlazosPayload {
  delivery?: string;
  license?: string;
  guarantee?: string;
  audit?: string;
}

export interface BlockFormPlazosProps {
  value: PlazosPayload;
  onChange: (payload: PlazosPayload) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BlockFormPlazos — formulario para el bloque PLAZOS_GARANTIAS.
 *
 * Campos: entrega estimada (date), licencias (text), aval (text),
 * auditoría (text). Todos opcionales.
 *
 * **A11y:** labels asociados, aria-describedby para errores,
 * aria-invalid en estado de error.
 */
export function BlockFormPlazos({
  value,
  onChange,
  errors,
  disabled = false,
  id = "block-plazos",
}: BlockFormPlazosProps) {
  function handleFieldChange(
    field: keyof PlazosPayload,
    fieldValue: string,
  ) {
    onChange({ ...value, [field]: fieldValue || undefined });
  }

  /**
   * Renders a date input with label and error.
   */
  function renderDateField(
    field: keyof PlazosPayload,
    label: string,
  ) {
    const inputId = `${id}-${field}`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className={LABEL_CLS}>
          {label}
        </label>
        <input
          id={inputId}
          type="date"
          value={(value[field] as string) ?? ""}
          disabled={disabled}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          aria-invalid={Boolean(errors?.[field])}
          className={cn(
            INPUT_BASE + INPUT_TRANSITION + INPUT_HOVER + INPUT_FOCUS,
            errors?.[field]
              ? "border-status-danger-default"
              : "border-border-default",
            disabled && INPUT_DISABLED,
          )}
        />
        {errors?.[field] && (
          <p role="alert" aria-live="polite" className={ERROR_CLS}>
            {errors[field]}
          </p>
        )}
      </div>
    );
  }

  /**
   * Renders a text input with label and error.
   */
  function renderTextField(
    field: keyof PlazosPayload,
    label: string,
    placeholder: string,
  ) {
    const inputId = `${id}-${field}`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className={LABEL_CLS}>
          {label}
        </label>
        <input
          id={inputId}
          type="text"
          value={(value[field] as string) ?? ""}
          disabled={disabled}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          aria-invalid={Boolean(errors?.[field])}
          placeholder={placeholder}
          className={cn(
            INPUT_CLS,
            errors?.[field]
              ? "border-status-danger-default"
              : "border-border-default",
            disabled && INPUT_DISABLED,
          )}
        />
        {errors?.[field] && (
          <p role="alert" aria-live="polite" className={ERROR_CLS}>
            {errors[field]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <span className={LABEL_CLS}>Plazos y garantías</span>
      {renderDateField("delivery", "Entrega estimada")}
      {renderTextField("license", "Licencias", "Ej: Licencia de obras concedida")}
      {renderTextField("guarantee", "Aval", "Ej: Aval bancario disponible")}
      {renderTextField("audit", "Auditoría", "Ej: Certificado energético en trámite")}
    </div>
  );
}
