"use client";

import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DescripcionPayload {
  text: string;
}

export interface BlockFormDescripcionProps {
  value: DescripcionPayload;
  onChange: (payload: DescripcionPayload) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BlockFormDescripcion — formulario para el bloque DESCRIPCION_GENERAL.
 *
 * Textarea con formato HTML limitado (strong, em, ul, ol, li, p, br).
 * Muestra un hint de los tags permitidos debajo del campo.
 *
 * **A11y:** label asociado via htmlFor, aria-describedby para errores,
 * aria-invalid en estado de error, role="alert" en mensajes de error.
 */
export function BlockFormDescripcion({
  value,
  onChange,
  errors,
  disabled = false,
  id = "block-descripcion",
}: BlockFormDescripcionProps) {
  const textErrorId = `${id}-text-error`;
  const textHelpId = `${id}-text-help`;
  const describedBy = [textHelpId, errors?.text ? textErrorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="space-y-1">
      <label
        htmlFor={`${id}-text`}
        className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
      >
        Descripción general
      </label>
      <textarea
        id={`${id}-text`}
        value={value.text}
        disabled={disabled}
        onChange={(e) => onChange({ text: e.target.value })}
        aria-describedby={describedBy}
        aria-invalid={Boolean(errors?.text)}
        rows={6}
        className={cn(
          "w-full rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle",
          "transition-colors duration-standard ease-standard",
          "hover:border-border-strong",
          "focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2",
          errors?.text
            ? "border-status-danger-default"
            : "border-border-default",
          disabled && "cursor-not-allowed bg-surface-sunken opacity-60",
        )}
        placeholder="Describe la promoción en detalle..."
      />
      <p
        id={textHelpId}
        className="font-sans text-sm text-fg-subtle"
      >
        Puedes usar etiquetas HTML: &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;,
        &lt;ol&gt;, &lt;li&gt;, &lt;p&gt;, &lt;br&gt;
      </p>
      {errors?.text && (
        <p
          id={textErrorId}
          role="alert"
          aria-live="polite"
          className="font-sans text-sm text-status-danger-default"
        >
          {errors.text}
        </p>
      )}
    </div>
  );
}
