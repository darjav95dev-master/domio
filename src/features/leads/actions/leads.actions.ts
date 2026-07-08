"use server";

import { headers } from "next/headers";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import { LeadRepository } from "@/infrastructure/db/repositories/lead.repository";
import { leads, consentRecords } from "@/infrastructure/db/schema";
import {
  leadFiltersSchema,
  leadPaginationSchema,
  leadNoteSchema,
  leadStatusTransitionSchema,
  leadReassignSchema,
} from "@/shared/types/lead-schema";
import { leadCreationSchema } from "@/shared/types/lead-creation-schema";
import type { LeadFilters } from "@/shared/types/lead-schema";
import type { LeadStatus } from "@/shared/constants/db-enums";

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
  const { session, repo } = await createContextAndRepo();

  return repo.getUnreadCount(session.userId);
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
  const { session, repo } = await createContextAndRepo();

  return repo.markAsRead(leadId, session.userId);
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
// T008 — createLeadAction: crea un lead desde formulario publico con
//         consentimiento RGPD en una sola transaccion
// ---------------------------------------------------------------------------

/**
 * Crea un lead con su registro de consentimiento RGPD asociado.
 * Usa PublicContext (sin autenticacion) porque es un formulario publico.
 * Si el consentimiento falta o es invalido, la transaccion no se completa.
 */
export async function createLeadAction(formData: FormData) {
  // 1. Parse and validate input
  const raw = {
    promocionId: formData.get("promocionId") as string,
    source: formData.get("source") as string,
    channel: formData.get("channel") as string | null,
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string | null,
    message: formData.get("message") as string | null,
    consentLegalBasis: formData.get("consentLegalBasis") as string,
    consentTextAccepted: formData.get("consentTextAccepted") as string,
  };

  const parsed = leadCreationSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "El consentimiento RGPD es obligatorio",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // 2. Get IP and user-agent from request headers
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? undefined;
  const userAgent = headersList.get("user-agent") ?? undefined;

  // 3. Create lead + consent record in the same transaction (atomico)
  const ctx = new PublicContext();
  const result = await ctx.withTransaction(async (tx) => {
    const [lead] = await tx
      .insert(leads)
      .values({
        tenantId: ctx.getTenantId(),
        promocionId: data.promocionId,
        tipologiaId: data.tipologiaId ?? null,
        source: data.source,
        channel: data.channel ?? null,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message ?? null,
      })
      .returning();

    if (!lead) {
      throw new Error("Failed to create lead");
    }

    const [consent] = await tx
      .insert(consentRecords)
      .values({
        tenantId: ctx.getTenantId(),
        leadId: lead.id,
        legalBasis: data.consentLegalBasis,
        textAccepted: data.consentTextAccepted,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      })
      .returning();

    if (!consent) {
      throw new Error("Failed to create consent record");
    }

    return { leadId: lead.id, consentId: consent.id };
  });

  return {
    success: true as const,
    ...result,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
