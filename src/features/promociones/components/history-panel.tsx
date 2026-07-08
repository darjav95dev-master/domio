"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/utils/cn";
import {
  PROPERTY_TYPE_LABELS,
  CONSTRUCTION_STATUS_LABELS,
  OPERATION_TYPE_LABELS,
  PROMOTION_STATUS_LABELS,
} from "@/shared/constants/domain-labels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoryItem {
  id: string;
  promocionId: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  authorName: string;
  createdAt: string;
}

interface HistoryPanelProps {
  promocionId: string;
}

// ---------------------------------------------------------------------------
// Field label mapping
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  kind: "Tipo",
  status: "Estado",
  propertyType: "Tipo de propiedad",
  operation: "Operación",
  constructionStatus: "Estado de obra",
  island: "Isla",
  municipality: "Municipio",
  address: "Dirección",
  mapPrivacyMode: "Privacidad del mapa",
  seoTitle: "Título SEO",
  seoDescription: "Descripción SEO",
  assignedAgentId: "Agente asignado",
};

/**
 * Maps a raw field value to a human-readable display string.
 * For enum fields (status, propertyType, etc.), looks up the label map.
 * For other fields, shows the value directly (or "—" if null).
 */
function formatFieldValue(field: string, value: string | null): string {
  if (value === null || value === undefined) return "—";

  if (field === "propertyType" && value in PROPERTY_TYPE_LABELS) {
    return PROPERTY_TYPE_LABELS[value as keyof typeof PROPERTY_TYPE_LABELS];
  }
  if (field === "constructionStatus" && value in CONSTRUCTION_STATUS_LABELS) {
    return CONSTRUCTION_STATUS_LABELS[
      value as keyof typeof CONSTRUCTION_STATUS_LABELS
    ];
  }
  if (field === "operation" && value in OPERATION_TYPE_LABELS) {
    return OPERATION_TYPE_LABELS[value as keyof typeof OPERATION_TYPE_LABELS];
  }
  if (field === "status" && value in PROMOTION_STATUS_LABELS) {
    return PROMOTION_STATUS_LABELS[
      value as keyof typeof PROMOTION_STATUS_LABELS
    ];
  }

  return value;
}

/**
 * Returns a relative time string from an ISO date.
 */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "hace unos segundos";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "hace 1 minuto";
  if (diffMin < 60) return `hace ${diffMin} minutos`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs === 1) return "hace 1 hora";
  if (diffHrs < 24) return `hace ${diffHrs} horas`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "hace 1 día";
  return `hace ${diffDays} días`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * HistoryPanel — Panel de histórico de cambios de una promoción.
 *
 * Muestra una lista cronológica (de más reciente a más antigua) de los
 * cambios registrados en `promocion_history`. Cada entrada es colapsable
 * y muestra: nombre del campo (legible), valor anterior → nuevo, autor
 * y timestamp relativo.
 *
 * **A11y:**
 * - `aria-live="polite"` mientras carga
 * - Botones de expansión con `aria-expanded`
 * - Estados de carga y error visibles
 *
 * **Design tokens:**
 * - Fondo `bg-bone` para las tarjetas de historial
 * - Borde `border-line` sutil
 * - Valores en `font-mono` con `tabular-nums`
 * - Timestamps en `text-fg-subtle text-sm`
 */
export function HistoryPanel({ promocionId }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch history ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/internal/promociones/${promocionId}/history`,
        );

        if (!response.ok) {
          throw new Error("Error al cargar el historial");
        }

        const data = (await response.json()) as { items: HistoryItem[] };

        if (!cancelled) {
          setItems(data.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar el historial",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [promocionId]);

  // ── Toggle collapse ──────────────────────────────────────────────────

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Loading state ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-3"
      >
        {/* Skeleton items */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-card bg-bone p-4"
          >
            <div className="mb-2 h-4 w-1/3 rounded bg-paper-2" />
            <div className="h-3 w-2/3 rounded bg-paper-2" />
          </div>
        ))}
        <span className="sr-only">Cargando historial…</span>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────

  if (error) {
    return (
      <div
        role="alert"
        className="border-l-[3px] border-accent-default bg-surface-sunken p-4 font-sans text-sm text-fg-muted"
      >
        {error}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="rounded-card bg-bone p-8 text-center font-sans text-sm text-fg-subtle">
        No hay cambios registrados
      </div>
    );
  }

  // ── Render list ──────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isExpanded = expandedIds.has(item.id);
        return (
          <div
            key={item.id}
            className="rounded-card border border-line bg-bone transition-shadow duration-standard ease-standard hover:shadow-sm"
          >
            {/* Entry header — clickable to expand */}
            <button
              type="button"
              onClick={() => toggleExpand(item.id)}
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between px-4 py-3 text-left font-sans text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium text-fg-default">
                  {getFieldLabel(item.field)}
                </span>
                <span className="text-fg-subtle">·</span>
                <span className="text-fg-subtle">{item.authorName}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-fg-subtle">
                  {relativeTime(item.createdAt)}
                </span>
                {/* Chevron */}
                <svg
                  aria-hidden="true"
                  className={cn(
                    "size-4 text-fg-subtle transition-transform duration-standard ease-standard",
                    isExpanded && "rotate-180",
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {/* Expanded content — old / new values */}
            {isExpanded && (
              <div className="border-t border-line px-4 py-3">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-xs tabular-nums">
                  <dt className="text-fg-subtle">Valor anterior</dt>
                  <dd className="text-fg-muted">
                    <code className="rounded bg-paper-2 px-1.5 py-0.5">
                      {formatFieldValue(item.field, item.oldValue)}
                    </code>
                  </dd>

                  <dt className="text-fg-subtle">Valor nuevo</dt>
                  <dd className="text-fg-default">
                    <code className="rounded bg-accent-subtle px-1.5 py-0.5">
                      {formatFieldValue(item.field, item.newValue)}
                    </code>
                  </dd>
                </dl>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
