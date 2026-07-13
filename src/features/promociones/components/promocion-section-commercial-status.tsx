"use client";

import { useState, useCallback } from "react";
import { cn } from "@/shared/utils/cn";
import {
  PROMOCION_STATUSES,
  CONSTRUCTION_STATUSES,
} from "@/shared/constants/db-enums";
import {
  PROMOTION_STATUS_LABELS,
  CONSTRUCTION_STATUS_LABELS,
} from "@/shared/constants/domain-labels";
import type { ConstructionWarning } from "@/shared/utils/construction-warning";
import { LABEL_STYLE, SELECT_STYLE } from "@/shared/styles/backoffice-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommercialStatusSectionValues {
  status: string;
  constructionStatus: string | null;
}

export interface CommercialStatusSectionErrors {
  status?: string;
  constructionStatus?: string;
}

export interface CommercialStatusSectionProps {
  values: CommercialStatusSectionValues;
  errors?: CommercialStatusSectionErrors;
  constructionWarning: ConstructionWarning | null;
  onChange: (values: CommercialStatusSectionValues) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_BASE =
  "rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PromocionSectionCommercialStatus — sección de estado comercial.
 *
 * Incluye: estado de la promoción y estado de obra.
 * Muestra un banner no bloqueante (warning) cuando constructionWarning
 * está presente — el operador puede descartarlo.
 *
 * **A11y:**
 * - `<label>` asociado vía `htmlFor`.
 * - Warning banner con `role="alert"`.
 * - Botón de descartar con `aria-label`.
 */
export function PromocionSectionCommercialStatus({
  values,
  errors = {},
  constructionWarning,
  onChange,
}: CommercialStatusSectionProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleChange = useCallback(
    <K extends keyof CommercialStatusSectionValues>(
      field: K,
      value: CommercialStatusSectionValues[K],
    ) => {
      onChange({ ...values, [field]: value });
    },
    [values, onChange],
  );

  const showWarning = constructionWarning && !dismissed;

  return (
    <fieldset className="rounded-card border border-border-default bg-bg-surface p-6">
      <legend className="font-display text-lg font-semibold text-fg-default">
        Estado comercial
      </legend>

      {/* Warning banner */}
      {showWarning && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-card border border-gold/30 bg-gold/10 p-4"
        >
          {/* Warning icon */}
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-gold"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>

          <div className="flex-1">
            <p className="font-sans text-sm font-medium text-fg-default">
              {constructionWarning.message}
            </p>
          </div>

          <button
            type="button"
            aria-label="Descartar aviso"
            onClick={() => setDismissed(true)}
            className={cn(
              "flex size-6 items-center justify-center rounded-full",
              "text-fg-subtle transition-colors duration-standard ease-standard",
              "hover:bg-fg-default/10 hover:text-fg-default",
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
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Status */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-status" className={LABEL_STYLE}>
            Estado
          </label>
          <select
            id="promocion-status"
            value={values.status}
            onChange={(e) => handleChange("status", e.target.value)}
            aria-invalid={Boolean(errors.status)}
            aria-describedby={
              errors.status ? "promocion-status-error" : undefined
            }
            className={cn(
              INPUT_BASE,
              SELECT_STYLE,
              errors.status && "border-status-danger-default",
            )}
          >
            {PROMOCION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROMOTION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {errors.status && (
            <p
              id="promocion-status-error"
              role="alert"
              aria-live="polite"
              className="font-sans text-sm text-status-danger-default"
            >
              {errors.status}
            </p>
          )}
        </div>

        {/* Construction Status */}
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor="promocion-construction-status" className={LABEL_STYLE}>
            Estado de obra
          </label>
          <select
            id="promocion-construction-status"
            value={values.constructionStatus ?? ""}
            onChange={(e) =>
              handleChange(
                "constructionStatus",
                e.target.value || null,
              )
            }
            aria-invalid={Boolean(errors.constructionStatus)}
            aria-describedby={
              errors.constructionStatus
                ? "promocion-construction-status-error"
                : undefined
            }
            className={cn(
              INPUT_BASE,
              SELECT_STYLE,
              errors.constructionStatus && "border-status-danger-default",
            )}
          >
            <option value="">Seleccionar…</option>
            {CONSTRUCTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CONSTRUCTION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {errors.constructionStatus && (
            <p
              id="promocion-construction-status-error"
              role="alert"
              aria-live="polite"
              className="font-sans text-sm text-status-danger-default"
            >
              {errors.constructionStatus}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}
