/**
 * Colores de estado para promociones.
 *
 * Cada entrada mapea un valor de PromocionStatus a clases de Tailwind
 * que consumen los tokens semánticos del sistema de diseño (status-*).
 *
 * @see src/shared/constants/db-enums.ts — PROMOCION_STATUSES
 * @see .specify/memory/design.md §2.2 — status tokens
 */

export const PROMOTION_STATUS_COLORS: Record<string, string> & {
  [key: string]: string;
} = {
  DRAFT:
    "bg-status-warning-subtle text-status-warning-default border-status-warning-default",
  PUBLISHED:
    "bg-status-success-subtle text-status-success-default border-status-success-default",
  RESERVED:
    "bg-status-info-subtle text-status-info-default border-status-info-default",
  SOLD: "bg-status-info-subtle text-status-info-default border-status-info-default",
  RENTED:
    "bg-status-success-subtle text-status-success-default border-status-success-default",
  WITHDRAWN:
    "bg-status-danger-subtle text-status-danger-default border-status-danger-default",
};
