import { z } from "zod";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_CHANNELS,
  type LeadStatus,
} from "@/shared/constants/db-enums";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  LEAD_NAME_MAX_LENGTH,
  LEAD_EMAIL_MAX_LENGTH,
  LEAD_MESSAGE_MAX_LENGTH,
} from "@/shared/constants/domain-config";

// ---------------------------------------------------------------------------
// Mapa de transiciones de estado (T006)
// ---------------------------------------------------------------------------

/**
 * Mapa inmutable que define las transiciones permitidas entre estados de lead.
 * Cada estado tiene un array de estados destino válidos. Un array vacío
 * significa que es un estado terminal (WON, LOST).
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED"],
  CONTACTED: ["IN_NEGOTIATION"],
  IN_NEGOTIATION: ["WON", "LOST"],
  WON: [],
  LOST: [],
} as const;

/**
 * Valida si una transición de estado es permitida según el mapa de transiciones.
 * Lanza un error descriptivo si la transición es inválida.
 */
export function validateStatusTransition(
  currentStatus: LeadStatus,
  newStatus: LeadStatus,
): void {
  if (currentStatus === newStatus) {
    throw new Error(
      `Invalid status transition: already in state ${currentStatus}`,
    );
  }

  const allowed = LEAD_STATUS_TRANSITIONS[currentStatus];
  if (!allowed) {
    throw new Error(
      `Invalid status transition: unknown current status ${currentStatus}`,
    );
  }

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: cannot transition from ${currentStatus} to ${newStatus}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Lead note schema
// ---------------------------------------------------------------------------

export const LEAD_NOTE_MAX_LENGTH = 5000;

export const leadNoteSchema = z.object({
  text: z.string().min(1).max(LEAD_NOTE_MAX_LENGTH),
});

export type LeadNoteInput = z.infer<typeof leadNoteSchema>;

// ---------------------------------------------------------------------------
// Lead filters schema
// ---------------------------------------------------------------------------

export const leadFiltersSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  search: z.string().min(1).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  promocionId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
});

export type LeadFilters = z.infer<typeof leadFiltersSchema>;

// ---------------------------------------------------------------------------
// Lead pagination schema
// ---------------------------------------------------------------------------

export const leadPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type LeadPagination = z.infer<typeof leadPaginationSchema>;

// ---------------------------------------------------------------------------
// Lead status transition schema (input validation)
// ---------------------------------------------------------------------------

export const leadStatusTransitionSchema = z
  .object({
    currentStatus: z.enum(LEAD_STATUSES),
    newStatus: z.enum(LEAD_STATUSES),
  })
  .refine(
    (data) => {
      const allowed = LEAD_STATUS_TRANSITIONS[data.currentStatus];
      return allowed ? allowed.includes(data.newStatus) : false;
    },
    {
      message: "Invalid status transition",
    },
  );

export type LeadStatusTransitionInput = z.infer<
  typeof leadStatusTransitionSchema
>;

// ---------------------------------------------------------------------------
// Lead reassign schema
// ---------------------------------------------------------------------------

export const leadReassignSchema = z.object({
  leadId: z.string().uuid().min(1),
  newAgentId: z.string().uuid().min(1),
});

export type LeadReassignInput = z.infer<typeof leadReassignSchema>;

// ---------------------------------------------------------------------------
// Lead paginated result
// ---------------------------------------------------------------------------

import { PaginatedResult } from "./pagination";

// ---------------------------------------------------------------------------
// Public lead form schema (existing, from public form)
// ---------------------------------------------------------------------------

/**
 * Schema Zod para validación de payloads de lead (incluye consentimiento RGPD).
 * El consentimiento es obligatorio — sin él, el lead no se persiste.
 */
export const leadSchema = z.object({
  name: z.string().min(1).max(LEAD_NAME_MAX_LENGTH),
  email: z.string().email().max(LEAD_EMAIL_MAX_LENGTH),
  phone: z.string().nullable(),
  message: z.string().max(LEAD_MESSAGE_MAX_LENGTH).nullable(),
  source: z.enum(LEAD_SOURCES),
  channel: z.enum(LEAD_CHANNELS).nullable(),
  promocionId: z.string().uuid(),
  tipologiaId: z.string().uuid().nullable(),
  consent: z.object({
    legalBasis: z.string(),
    textAccepted: z.string(),
  }),
});

export type LeadPayload = z.infer<typeof leadSchema>;
