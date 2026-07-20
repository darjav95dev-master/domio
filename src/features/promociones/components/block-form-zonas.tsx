"use client";

import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Shared CSS class strings
// ---------------------------------------------------------------------------

const LABEL_CLS =
  "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle";
const ERROR_CLS = "font-sans text-sm text-status-danger-default";
const SUBTLE_CLS = "font-sans text-sm text-fg-subtle";
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
const ADD_BTN_CLS =
  "rounded-pill border border-accent-default px-3 py-1 font-sans text-xs font-medium text-accent-default";
const REMOVE_BTN_CLS =
  "font-sans text-sm text-status-danger-default underline underline-offset-4";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZonaItem {
  name: string;
  description: string;
}

export interface ZonasPayload {
  items: ZonaItem[];
}

export interface BlockFormZonasProps {
  value: ZonasPayload;
  onChange: (payload: ZonasPayload) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptyItem(): ZonaItem {
  return { name: "", description: "" };
}

function itemKey(index: number): string {
  // ponytail: index-only key to prevent remount on content change (focus loss bug)
  return `zona-${index}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BlockFormZonas — formulario para el bloque ZONAS_COMUNES.
 *
 * Lista dinámica de ítems con nombre y descripción.
 * Permite añadir y eliminar elementos.
 *
 * **A11y:** labels asociados, errores inline, focus-visible en controles.
 */
export function BlockFormZonas({
  value,
  onChange,
  errors,
  disabled = false,
  id = "block-zonas",
}: BlockFormZonasProps) {
  const items = value.items ?? [];

  function handleItemChange(
    index: number,
    field: keyof ZonaItem,
    fieldValue: string,
  ) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: fieldValue } : item,
    );
    onChange({ items: updated });
  }

  function handleAddItem() {
    onChange({ items: [...items, createEmptyItem()] });
  }

  function handleRemoveItem(index: number) {
    onChange({ items: items.filter((_, i) => i !== index) });
  }

  const itemsErrorId = `${id}-items-error`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={LABEL_CLS}>Zonas comunes</span>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddItem}
          className={cn(
            ADD_BTN_CLS,
            "hover:bg-accent-default hover:text-fg-on-inverted",
            "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          + Añadir zona
        </button>
      </div>

      {items.length === 0 && (
        <p className={SUBTLE_CLS}>
          Aún no hay zonas comunes. Pulsa "Añadir zona" para añadir la
          primera.
        </p>
      )}

      {errors?.items && (
        <p
          id={itemsErrorId}
          role="alert"
          aria-live="polite"
          className={ERROR_CLS}
        >
          {errors.items}
        </p>
      )}

      <ul className="space-y-4" aria-label="Lista de zonas comunes">
        {items.map((item, index) => (
          <li
            key={itemKey(index)}
            className="rounded-card border border-border-default bg-bg-surface p-4"
          >
            <div className="space-y-3">
              {/* Nombre */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${id}-${index}-name`}
                  className={LABEL_CLS}
                >
                  Nombre *
                </label>
                <input
                  id={`${id}-${index}-name`}
                  type="text"
                  value={item.name}
                  disabled={disabled}
                  onChange={(e) =>
                    handleItemChange(index, "name", e.target.value)
                  }
                  aria-invalid={Boolean(errors?.[`items.${index}.name`])}
                  placeholder="Ej: Piscina comunitaria"
                  className={cn(
                    INPUT_CLS,
                    errors?.[`items.${index}.name`]
                      ? "border-status-danger-default"
                      : "border-border-default",
                    disabled && INPUT_DISABLED,
                  )}
                />
                {errors?.[`items.${index}.name`] && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={ERROR_CLS}
                  >
                    {errors[`items.${index}.name`]}
                  </p>
                )}
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${id}-${index}-description`}
                  className={LABEL_CLS}
                >
                  Descripción *
                </label>
                <textarea
                  id={`${id}-${index}-description`}
                  value={item.description}
                  disabled={disabled}
                  onChange={(e) =>
                    handleItemChange(index, "description", e.target.value)
                  }
                  aria-invalid={Boolean(
                    errors?.[`items.${index}.description`],
                  )}
                  rows={2}
                  placeholder="Describe esta zona común..."
                  className={cn(
                    "w-full " + INPUT_CLS,
                    errors?.[`items.${index}.description`]
                      ? "border-status-danger-default"
                      : "border-border-default",
                    disabled && INPUT_DISABLED,
                  )}
                />
                {errors?.[`items.${index}.description`] && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={ERROR_CLS}
                  >
                    {errors[`items.${index}.description`]}
                  </p>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemoveItem(index)}
                className={cn(
                  REMOVE_BTN_CLS,
                  "transition-colors duration-standard ease-standard",
                  "hover:text-accent-hover",
                  "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                Eliminar zona
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
