import { cn } from "@/shared/utils/cn";
import { LEAD_STATUS_LABELS as STATUS_LABELS } from "@/shared/constants/domain-labels";
import type { LeadStatus } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Styles — cada estado usa tokens semánticos de estado
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-status-info-subtle text-status-info-default ring-status-info-default/20",
  CONTACTED:
    "bg-status-warning-subtle text-status-warning-default ring-status-warning-default/20",
  IN_NEGOTIATION:
    "bg-accent-subtle text-accent-default ring-accent-default/20",
  WON: "bg-status-success-subtle text-status-success-default ring-status-success-default/20",
  LOST: "bg-status-danger-subtle text-status-danger-default ring-status-danger-default/20",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LeadStatusBadgeProps {
  status: LeadStatus;
  /** Optional additional class names */
  className?: string;
}

/**
 * LeadStatusBadge — badge coloreado por estado del lead.
 *
 * - NEW (azul semántico): bg-status-info-subtle
 * - CONTACTED (amarillo): bg-status-warning-subtle
 * - IN_NEGOTIATION (naranja): bg-accent-subtle
 * - WON (verde): bg-status-success-subtle
 * - LOST (rojo): bg-status-danger-subtle
 *
 * Accesibilidad: aria-label con el texto legible del estado.
 */
export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5",
        "font-mono text-[11px] font-medium uppercase tracking-[0.08em]",
        "ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
      aria-label={`Estado: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
