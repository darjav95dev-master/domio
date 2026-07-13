"use server";

import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { LeadRepository } from "@/infrastructure/db/repositories/lead.repository";
import { LeadReadMarkRepository } from "@/infrastructure/db/repositories/lead-read-mark.repository";
import {
  leadFiltersSchema,
  leadPaginationSchema,
  leadNoteSchema,
  leadStatusTransitionSchema,
  leadReassignSchema,
} from "@/shared/types/lead-schema";
import type { LeadFilters } from "@/shared/types/lead-schema";
import type { LeadStatus } from "@/shared/constants/db-enums";
import { escapeCsvField } from "@/shared/utils/csv";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createContextAndRepo(): Promise<{
  session: import("@/infrastructure/auth/session").ServerSession;
  ctx: AuthenticatedContext;
  repo: LeadRepository;
}> {
  const session = await getServerSession();
  if (!session) throw new Error("Permission denied");

  const ctx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const repo = new LeadRepository(ctx);
  return { session, ctx, repo };
}

async function createReadMarkRepo(): Promise<{
  session: import("@/infrastructure/auth/session").ServerSession;
  readMarkRepo: LeadReadMarkRepository;
}> {
  const session = await getServerSession();
  if (!session) throw new Error("Permission denied");

  const ctx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const readMarkRepo = new LeadReadMarkRepository(ctx);
  return { session, readMarkRepo };
}

// ---------------------------------------------------------------------------
// T007 — getLeadsAction: listado paginado con filtros
// ---------------------------------------------------------------------------

export async function getLeadsAction(
  filters: LeadFilters = {},
  page: number = 1,
) {
  const { repo } = await createContextAndRepo();

  const parsedFilters = leadFiltersSchema.parse(filters);
  const pagination = leadPaginationSchema.parse({ page });

  return repo.findAll(parsedFilters, pagination);
}

// ---------------------------------------------------------------------------
// T007 — getUnreadCountAction: conteo de leads no leídos
// ---------------------------------------------------------------------------

export async function getUnreadCountAction(): Promise<number> {
  const { session, readMarkRepo } = await createReadMarkRepo();

  return readMarkRepo.getUnreadCount(session.userId);
}

// ---------------------------------------------------------------------------
// T011 — getLeadDetailAction: detalle completo + notas + histórico
// ---------------------------------------------------------------------------

export async function getLeadDetailAction(id: string) {
  const { repo } = await createContextAndRepo();

  const lead = await repo.findById(id);
  if (!lead) throw new Error("Lead not found");

  const notes = await repo.getNotes(id);
  const history = await repo.getLeadHistory(id);

  return { lead, notes, history };
}

// ---------------------------------------------------------------------------
// T011 — addNoteAction: añadir nota interna
// ---------------------------------------------------------------------------

export async function addNoteAction(leadId: string, text: string) {
  const { session, repo } = await createContextAndRepo();

  const parsed = leadNoteSchema.parse({ text });
  return repo.addNote(leadId, parsed.text, session.userId);
}

// ---------------------------------------------------------------------------
// T011 — markAsReadAction: marcar lead como leído
// ---------------------------------------------------------------------------

export async function markAsReadAction(leadId: string) {
  const { session, readMarkRepo } = await createReadMarkRepo();

  return readMarkRepo.markAsRead(leadId, session.userId);
}

// ---------------------------------------------------------------------------
// T015 — updateLeadStatusAction: cambiar estado siguiendo máquina de estados
// ---------------------------------------------------------------------------

export async function updateLeadStatusAction(
  leadId: string,
  newStatus: LeadStatus,
) {
  const { session, repo } = await createContextAndRepo();

  // Fetch current lead to get current status for validation
  const lead = await repo.findById(leadId);
  if (!lead) throw new Error("Lead not found");

  // Validate the transition server-side via Zod refine
  leadStatusTransitionSchema.parse({
    currentStatus: lead.status,
    newStatus,
  });

  // Perform the update (repo already validates via validateStatusTransition)
  return repo.updateStatus(leadId, newStatus, session.userId);
}

// ---------------------------------------------------------------------------
// T017 — reassignLeadAction: reasignar lead a otro agente (solo ADMIN)
// ---------------------------------------------------------------------------

export async function reassignLeadAction(leadId: string, newAgentId: string) {
  const { session, repo } = await createContextAndRepo();

  if (session.role !== "ADMIN") {
    throw new Error("Only ADMIN can reassign leads");
  }

  leadReassignSchema.parse({ leadId, newAgentId });

  return repo.reassign(leadId, newAgentId);
}

// ---------------------------------------------------------------------------
// T019 — exportLeadsCsvAction: exportar leads a CSV
// ---------------------------------------------------------------------------

export async function exportLeadsCsvAction(filters: LeadFilters = {}) {
  const { session, repo } = await createContextAndRepo();

  const parsedFilters = leadFiltersSchema.parse(filters);
  const leads = await repo.exportCsv(
    parsedFilters,
    session.userId,
    session.role,
  );

  // Generate CSV string
  const headers = [
    "ID",
    "Nombre",
    "Email",
    "Teléfono",
    "Estado",
    "Source",
    "Canal",
    "Promoción ID",
    "Agente Asignado",
    "Mensaje",
    "Creado",
    "Actualizado",
  ];

  const rows = leads.map((l) => [
    l.id,
    escapeCsvField(l.name),
    escapeCsvField(l.email),
    escapeCsvField(l.phone ?? ""),
    l.status,
    l.source,
    escapeCsvField(l.channel ?? ""),
    l.promocionId,
    escapeCsvField(l.assignedAgentId ?? ""),
    escapeCsvField(l.message ?? ""),
    l.createdAt instanceof Date
      ? l.createdAt.toISOString()
      : String(l.createdAt),
    l.updatedAt instanceof Date
      ? l.updatedAt.toISOString()
      : String(l.updatedAt),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

// ---------------------------------------------------------------------------
// Re-export: createLeadAction (backward compatibility for contact-form.tsx)
// ---------------------------------------------------------------------------
// La implementación canónica vive en engagement/server/create-lead-action.ts
// y acepta un objeto tipado (CreateLeadInput). Este wrapper adapta FormData
// para mantener compatibilidad con contact-form.tsx que pasa FormData directo.
import { createLeadAction as createLeadActionTyped } from "@/features/engagement/server/create-lead-action";

export async function createLeadAction(formData: FormData) {
  return createLeadActionTyped({
    name: (formData.get("name") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    message: (formData.get("message") as string) ?? "",
    consent: true,
    phone: (formData.get("phone") as string) || undefined,
    promocionId: (formData.get("promocionId") as string) ?? "00000000-0000-0000-0000-000000000000",
    turnstileToken: (formData.get("turnstileToken") as string) || undefined,
  });
}

