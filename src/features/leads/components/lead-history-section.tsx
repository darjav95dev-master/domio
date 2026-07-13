"use client";

import { cn } from "@/shared/utils/cn";
import { LEAD_STATUS_LABELS as STATUS_LABELS } from "@/shared/constants/domain-labels";
import type { LeadHistoryRow } from "@/infrastructure/db/repositories/lead.repository";
import type { LeadStatus } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadHistorySectionProps {
  history: LeadHistoryRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadHistorySection({ history }: LeadHistorySectionProps) {
  return (
    <section
      aria-label="Histórico de cambios"
      className="rounded-card border border-border-default bg-bg-surface p-6"
    >
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
        Histórico de cambios
      </h2>

      {history.length === 0 && (
        <p className="mt-4 font-sans text-sm text-fg-subtle">
          No hay cambios registrados.
        </p>
      )}

      {history.length > 0 && (
        <ol className="mt-4 space-y-0">
          {history.map((entry, idx) => (
            <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Timeline line */}
              {idx < history.length - 1 && (
                <div
                  className="absolute left-[7px] top-5 h-full w-px bg-border-default"
                  aria-hidden="true"
                />
              )}

              {/* Timeline dot */}
              <div className="relative flex shrink-0 items-start pt-1">
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border-2",
                    idx === 0
                      ? "border-accent-default bg-accent-subtle"
                      : "border-border-strong bg-bg-surface",
                  )}
                  aria-hidden="true"
                />
              </div>

              {/* Timeline content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-sans text-sm font-medium text-fg-default">
                    {STATUS_LABELS[entry.toStatus as LeadStatus] ??
                      entry.toStatus}
                  </span>
                  <span className="font-sans text-xs text-fg-subtle">
                    {entry.fromStatus
                      ? `desde ${STATUS_LABELS[entry.fromStatus as LeadStatus] ?? entry.fromStatus}`
                      : "Estado inicial"}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
                  {formatDate(entry.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
