"use client";

import { cn } from "@/shared/utils/cn";
import { LABEL_STYLE } from "@/shared/styles/backoffice-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeoSectionValues {
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface SeoSectionErrors {
  seoTitle?: string;
  seoDescription?: string;
}

export interface SeoSectionProps {
  values: SeoSectionValues;
  errors?: SeoSectionErrors;
  onChange: (values: SeoSectionValues) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEO_TITLE_MAX = 70;
const SEO_DESCRIPTION_MAX = 160;

const INPUT_BASE =
  "rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PromocionSectionSeo — sección SEO de la promoción.
 *
 * Incluye: título SEO (max 70 caracteres) y descripción SEO (max 160
 * caracteres). Ambos opcionales — si se dejan vacíos, se generarán
 * automáticamente en la superficie pública.
 *
 * **A11y:**
 * - Cada campo tiene `<label>` vía `htmlFor`.
 * - Contadores de caracteres con `aria-live="polite"`.
 * - Helper text explicando el comportamiento por defecto.
 */
export function PromocionSectionSeo({
  values,
  errors = {},
  onChange,
}: SeoSectionProps) {
  const seoTitleLen = values.seoTitle?.length ?? 0;
  const seoDescLen = values.seoDescription?.length ?? 0;

  const titleNearLimit = seoTitleLen > SEO_TITLE_MAX * 0.85;
  const descNearLimit = seoDescLen > SEO_DESCRIPTION_MAX * 0.85;

  return (
    <fieldset className="rounded-card border border-border-default bg-bg-surface p-6">
      <legend className="font-display text-lg font-semibold text-fg-default">
        SEO
      </legend>

      <p className="mt-2 font-sans text-sm text-fg-subtle">
        Si se deja vacío, se generará automáticamente.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-6">
        {/* SEO Title */}
        <div className="flex flex-col gap-stack-xs">
          <div className="flex items-center justify-between">
            <label htmlFor="promocion-seo-title" className={LABEL_STYLE}>
              Título SEO
            </label>
            <span
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                "font-mono text-[11px] tabular-nums",
                titleNearLimit
                  ? "text-status-warning-default"
                  : "text-fg-subtle",
              )}
            >
              {seoTitleLen}/{SEO_TITLE_MAX}
            </span>
          </div>
          <input
            id="promocion-seo-title"
            type="text"
            value={values.seoTitle ?? ""}
            onChange={(e) =>
              onChange({
                ...values,
                seoTitle: e.target.value || null,
              })
            }
            maxLength={SEO_TITLE_MAX}
            placeholder="Título para motores de búsqueda"
            aria-invalid={Boolean(errors.seoTitle)}
            aria-describedby={
              errors.seoTitle ? "promocion-seo-title-error" : undefined
            }
            className={cn(
              INPUT_BASE,
              errors.seoTitle && "border-status-danger-default",
            )}
          />
          {errors.seoTitle && (
            <p
              id="promocion-seo-title-error"
              role="alert"
              aria-live="polite"
              className="font-sans text-sm text-status-danger-default"
            >
              {errors.seoTitle}
            </p>
          )}
        </div>

        {/* SEO Description */}
        <div className="flex flex-col gap-stack-xs">
          <div className="flex items-center justify-between">
            <label
              htmlFor="promocion-seo-description"
              className={LABEL_STYLE}
            >
              Descripción SEO
            </label>
            <span
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                "font-mono text-[11px] tabular-nums",
                descNearLimit
                  ? "text-status-warning-default"
                  : "text-fg-subtle",
              )}
            >
              {seoDescLen}/{SEO_DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            id="promocion-seo-description"
            value={values.seoDescription ?? ""}
            onChange={(e) =>
              onChange({
                ...values,
                seoDescription: e.target.value || null,
              })
            }
            maxLength={SEO_DESCRIPTION_MAX}
            placeholder="Descripción para motores de búsqueda"
            rows={3}
            aria-invalid={Boolean(errors.seoDescription)}
            aria-describedby={
              errors.seoDescription
                ? "promocion-seo-description-error"
                : undefined
            }
            className={cn(
              INPUT_BASE,
              "resize-y min-h-[80px]",
              errors.seoDescription && "border-status-danger-default",
            )}
          />
          {errors.seoDescription && (
            <p
              id="promocion-seo-description-error"
              role="alert"
              aria-live="polite"
              className="font-sans text-sm text-status-danger-default"
            >
              {errors.seoDescription}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}
