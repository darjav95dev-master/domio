"use server";

import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { ArsopRepository } from "@/infrastructure/db/repositories/arsop.repository";
import { MediaService } from "@/infrastructure/media/media.service";

// ---------------------------------------------------------------------------
// T011 — exportLeadAction: exportar datos de un lead a CSV (solo ADMIN)
// ---------------------------------------------------------------------------

export async function exportLeadAction(leadId: string) {
  const session = await getServerSession();

  if (!session) {
    throw new Error("Permission denied");
  }

  if (session.role !== "ADMIN") {
    throw new Error("Only ADMIN can export lead data");
  }

  const ctx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );

  const mediaService = new MediaService(session.tenantId);
  const repo = new ArsopRepository(ctx, mediaService);

  return repo.exportLead(leadId, session.userId);
}

// ---------------------------------------------------------------------------
// T014 — deleteLeadAction: borrar lead y datos asociados en cascada (solo ADMIN)
// ---------------------------------------------------------------------------

export async function deleteLeadAction(leadId: string) {
  const session = await getServerSession();

  if (!session) {
    throw new Error("Permission denied");
  }

  if (session.role !== "ADMIN") {
    throw new Error("Only ADMIN can delete lead data");
  }

  const ctx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );

  const mediaService = new MediaService(session.tenantId);
  const repo = new ArsopRepository(ctx, mediaService);

  return repo.deleteLead(leadId, session.userId);
}
