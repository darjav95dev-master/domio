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

export interface UbicacionItem {
  service: string;
  distance: string;
}

export interface UbicacionPayload {
  items: UbicacionItem[];
}

export interface BlockFormUbicacionProps {
  value: UbicacionPayload;
  onChange: (payload: UbicacionPayload) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptyItem(): UbicacionItem {
  return { service: "", distance: "" };
}

function itemKey(index: number, item: UbicacionItem): string {
  return `ubicacion-${index}-${item.service || "empty"}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BlockFormUbicacion — formulario para el bloque UBICACION_SERVICIOS.
 *
 * Lista dinámica de ítems con servicio y distancia.
 * Permite añadir y eliminar elementos.
 *
 * **A11y:** labels asociados, errores inline, focus-visible en controles.
 */
export function BlockFormUbicacion({
  value,
  onChange,
  errors,
  disabled = false,
  id = "block-ubicacion",
}: BlockFormUbicacionProps) {
  const items = value.items ?? [];

  function handleItemChange(
    index: number,
    field: keyof UbicacionItem,
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
        <span className={LABEL_CLS}>Ubicación y servicios</span>
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
          + Añadir servicio
        </button>
      </div>

      {items.length === 0 && (
        <p className={SUBTLE_CLS}>
          Aún no hay servicios cercanos. Pulsa "Añadir servicio" para añadir
          el primero.
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

      <ul className="space-y-4" aria-label="Lista de servicios cercanos">
        {items.map((item, index) => (
          <li
            key={itemKey(index, item)}
            className="rounded-card border border-border-default bg-bg-surface p-4"
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Servicio */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${id}-${index}-service`}
                  className={LABEL_CLS}
                >
                  Servicio *
                </label>
                <input
                  id={`${id}-${index}-service`}
                  type="text"
                  value={item.service}
                  disabled={disabled}
                  onChange={(e) =>
                    handleItemChange(index, "service", e.target.value)
                  }
                  aria-invalid={Boolean(
                    errors?.[`items.${index}.service`],
                  )}
                  placeholder="Ej: Supermercado"
                  className={cn(
                    INPUT_CLS,
                    errors?.[`items.${index}.service`]
                      ? "border-status-danger-default"
                      : "border-border-default",
                    disabled && INPUT_DISABLED,
                  )}
                />
                {errors?.[`items.${index}.service`] && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={ERROR_CLS}
                  >
                    {errors[`items.${index}.service`]}
                  </p>
                )}
              </div>

              {/* Distancia */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${id}-${index}-distance`}
                  className={LABEL_CLS}
                >
                  Distancia *
                </label>
                <input
                  id={`${id}-${index}-distance`}
                  type="text"
                  value={item.distance}
                  disabled={disabled}
                  onChange={(e) =>
                    handleItemChange(index, "distance", e.target.value)
                  }
                  aria-invalid={Boolean(
                    errors?.[`items.${index}.distance`],
                  )}
                  placeholder="Ej: 5 min andando"
                  className={cn(
                    INPUT_CLS,
                    errors?.[`items.${index}.distance`]
                      ? "border-status-danger-default"
                      : "border-border-default",
                    disabled && INPUT_DISABLED,
                  )}
                />
                {errors?.[`items.${index}.distance`] && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={ERROR_CLS}
                  >
                    {errors[`items.${index}.distance`]}
                  </p>
                )}
              </div>
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
                "mt-3",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              Eliminar servicio
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
