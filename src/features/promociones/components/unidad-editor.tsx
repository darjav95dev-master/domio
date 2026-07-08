"use client";

import { cn } from "@/shared/utils/cn";
import { UNIT_STATUSES } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnidadEditorItem {
  /** Temporary ID for React keys (will be replaced by DB id on persist). */
  _tempId: string;
  identifier: string | null;
  status: string;
}

export interface UnidadEditorProps {
  unidades: UnidadEditorItem[];
  onChange: (unidades: UnidadEditorItem[]) => void;
  /** Optional label prefix for screen readers (e.g. tipología name). */
  labelPrefix?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNIT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservada",
  SOLD: "Vendida",
  RENTED: "Alquilada",
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
  return `unidad-temp-${tempIdCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * UnidadEditor — editor de unidades dentro de una tipología.
 *
 * Lista de unidades con identificador y estado. Permite añadir y eliminar
 * unidades. Cada unidad se identifica por `_tempId` para React keys.
 *
 * **A11y:**
 * - Cada fila tiene labels semánticos.
 * - Botones de eliminar con `aria-label`.
 * - Botón de añadir con texto descriptivo.
 */
export function UnidadEditor({
  unidades,
  onChange,
  labelPrefix,
}: UnidadEditorProps) {
  const handleIdentifierChange = (tempId: string, value: string) => {
    onChange(
      unidades.map((u) =>
        u._tempId === tempId ? { ...u, identifier: value || null } : u,
      ),
    );
  };

  const handleStatusChange = (tempId: string, value: string) => {
    onChange(
      unidades.map((u) =>
        u._tempId === tempId ? { ...u, status: value } : u,
      ),
    );
  };

  const handleRemove = (tempId: string) => {
    onChange(unidades.filter((u) => u._tempId !== tempId));
  };

  const handleAdd = () => {
    onChange([
      ...unidades,
      {
        _tempId: nextTempId(),
        identifier: null,
        status: "AVAILABLE",
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
          {labelPrefix ? `Unidades — ${labelPrefix}` : "Unidades"}
        </h4>
        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "rounded-pill border border-border-default px-3 py-1",
            "font-sans text-xs font-medium text-fg-default",
            "transition-colors duration-standard ease-standard",
            "hover:border-accent-default hover:text-accent-default",
          )}
        >
          + Añadir unidad
        </button>
      </div>

      {unidades.length === 0 && (
        <p className="font-sans text-sm text-fg-subtle">
          No hay unidades. Añade la primera unidad para esta tipología.
        </p>
      )}

      {unidades.length > 0 && (
        <div className="divide-y divide-border-subtle rounded-control border border-border-default">
          {unidades.map((unidad) => (
            <div
              key={unidad._tempId}
              className="flex items-end gap-4 p-4"
            >
              {/* Identifier */}
              <div className="flex flex-1 flex-col gap-stack-xs">
                <label
                  htmlFor={`unidad-identifier-${unidad._tempId}`}
                  className={LABEL_STYLE}
                >
                  Identificador
                </label>
                <input
                  id={`unidad-identifier-${unidad._tempId}`}
                  type="text"
                  value={unidad.identifier ?? ""}
                  onChange={(e) =>
                    handleIdentifierChange(unidad._tempId, e.target.value)
                  }
                  placeholder="Ej. 1A, 2B"
                  className={INPUT_BASE}
                />
              </div>

              {/* Status */}
              <div className="flex w-[180px] flex-col gap-stack-xs">
                <label
                  htmlFor={`unidad-status-${unidad._tempId}`}
                  className={LABEL_STYLE}
                >
                  Estado
                </label>
                <select
                  id={`unidad-status-${unidad._tempId}`}
                  value={unidad.status}
                  onChange={(e) =>
                    handleStatusChange(unidad._tempId, e.target.value)
                  }
                  className={cn(INPUT_BASE, SELECT_STYLE)}
                >
                  {UNIT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {UNIT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remove */}
              <button
                type="button"
                aria-label={`Eliminar unidad ${unidad.identifier ?? "sin identificar"}`}
                onClick={() => handleRemove(unidad._tempId)}
                className={cn(
                  "mb-0.5 flex size-9 items-center justify-center rounded-control",
                  "text-fg-subtle transition-colors duration-standard ease-standard",
                  "hover:bg-status-danger-subtle hover:text-status-danger-default",
                )}
              >
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
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
