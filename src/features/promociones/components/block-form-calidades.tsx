"use client";

import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Shared CSS class strings (extracted to avoid sonarjs/no-duplicate-string)
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
const ADD_BTN_CLS =
  "rounded-pill border border-accent-default px-3 py-1 font-sans text-xs font-medium text-accent-default";

/** Base input classes (without error border). */
const BORDER_DEFAULT = "border-border-default";

const INPUT_CLS =
  INPUT_BASE + INPUT_PLACEHOLDER + INPUT_TRANSITION + INPUT_HOVER + INPUT_FOCUS;

/** Select (same as input but no placeholder). */
const SELECT_CLS =
  INPUT_BASE + INPUT_TRANSITION + INPUT_HOVER + INPUT_FOCUS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalidadItem {
  title: string;
  description: string;
  icon?: string;
}

export interface CalidadesPayload {
  items: CalidadItem[];
}

export interface BlockFormCalidadesProps {
  value: CalidadesPayload;
  onChange: (payload: CalidadesPayload) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// Icon options
// ---------------------------------------------------------------------------

const ICON_OPTIONS = [
  { value: "", label: "Sin icono" },
  { value: "building", label: "Edificio" },
  { value: "star", label: "Estrella" },
  { value: "leaf", label: "Hoja" },
  { value: "shield", label: "Escudo" },
  { value: "lightning", label: "Rayo" },
  { value: "heart", label: "Corazón" },
  { value: "check", label: "Check" },
  { value: "medal", label: "Medalla" },
  { value: "sun", label: "Sol" },
  { value: "drop", label: "Gota" },
  { value: "fire", label: "Fuego" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptyItem(): CalidadItem {
  return { title: "", description: "", icon: "" };
}

function itemKey(index: number): string {
  // ponytail: index-only key to prevent remount on content change (focus loss bug)
  return `calidad-${index}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BlockFormCalidades — formulario para el bloque MEMORIA_CALIDADES.
 *
 * Lista dinámica de ítems con icono (selector de texto),
 * título y descripción. Permite añadir y eliminar elementos.
 *
 * **A11y:** cada fila tiene labels asociados, errores inline,
 * focus-visible en todos los controles.
 */
export function BlockFormCalidades({
  value,
  onChange,
  errors,
  disabled = false,
  id = "block-calidades",
}: BlockFormCalidadesProps) {
  const items = value.items ?? [];

  function handleItemChange(
    index: number,
    field: keyof CalidadItem,
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
        <span className={LABEL_CLS}>Calidades</span>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddItem}
          className={cn(
            ADD_BTN_CLS,
            "hover:bg-accent-default hover:text-fg-on-inverted",
            "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2",
            disabled && INPUT_DISABLED,
          )}
        >
          + Añadir calidad
        </button>
      </div>

      {items.length === 0 && (
        <p className={SUBTLE_CLS}>
          Aún no hay calidades. Pulsa "Añadir calidad" para añadir la primera.
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

      <ul className="space-y-4" aria-label="Lista de calidades">
        {items.map((item, index) => (
          <li
            key={itemKey(index)}
            className="rounded-card border border-border-default bg-bg-surface p-4"
          >
            <div className="space-y-3">
              {/* Icono selector */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${id}-${index}-icon`}
                  className={LABEL_CLS}
                >
                  Icono
                </label>
                <select
                  id={`${id}-${index}-icon`}
                  value={item.icon ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    handleItemChange(index, "icon", e.target.value)
                  }
                  className={cn(
                    SELECT_CLS,
                    BORDER_DEFAULT,
                    disabled && INPUT_DISABLED,
                  )}
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${id}-${index}-title`}
                  className={LABEL_CLS}
                >
                  Título *
                </label>
                <input
                  id={`${id}-${index}-title`}
                  type="text"
                  value={item.title}
                  disabled={disabled}
                  onChange={(e) =>
                    handleItemChange(index, "title", e.target.value)
                  }
                  aria-invalid={Boolean(errors?.[`items.${index}.title`])}
                  placeholder="Ej: Acabados de lujo"
                  className={cn(
                    INPUT_CLS,
                    errors?.[`items.${index}.title`]
                      ? "border-status-danger-default"
                      : BORDER_DEFAULT,
                    disabled && INPUT_DISABLED,
                  )}
                />
                {errors?.[`items.${index}.title`] && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={ERROR_CLS}
                  >
                    {errors[`items.${index}.title`]}
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
                  placeholder="Describe esta calidad..."
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
                  "font-sans text-sm text-status-danger-default underline underline-offset-4",
                  "transition-colors duration-standard ease-standard",
                  "hover:text-accent-hover",
                  "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                Eliminar calidad
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
