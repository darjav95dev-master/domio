import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { LeadRepository } from "@/infrastructure/db/repositories/lead.repository";
import { LeadReadMarkRepository } from "@/infrastructure/db/repositories/lead-read-mark.repository";
import { LeadDetail } from "@/features/leads/components/lead-detail";
import { ArsopButtons } from "@/features/leads/components/arsop-buttons";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * LeadDetailPage — server component que carga el detalle del lead y lo
 * renderiza a través de LeadDetail (client component).
 *
 * Al cargar, marca el lead como leído automáticamente (T013 requirement).
 */
export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  // OPERATOR role is not allowed to access leads
  if (session.role === "OPERATOR") {
    redirect("/panel");
  }

  const ctx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const repo = new LeadRepository(ctx);
  const readMarkRepo = new LeadReadMarkRepository(ctx);

  // Fetch lead detail + notes + history
  const lead = await repo.findById(id);
  if (!lead) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <h1 className="font-display text-2xl font-semibold text-fg-default">
          Lead no encontrado
        </h1>
        <p className="font-sans text-base text-fg-muted">
          El lead que buscas no existe o no tienes acceso a él.
        </p>
      </div>
    );
  }

  // Auto-mark as read when opening the detail (T013 requirement)
  try {
    await readMarkRepo.markAsRead(id, session.userId);
  } catch {
    // Non-critical: if marking as read fails, still show the lead
  }

  // Fetch notes and history
  const notes = await repo.getNotes(id);
  const history = await repo.getLeadHistory(id);

  return (
    <>
      <LeadDetail
        lead={lead}
        notes={notes}
        history={history}
        currentUserRole={session.role}
      />

      {session.role === "ADMIN" && (
        <div className="mt-8">
          <ArsopButtons leadId={id} />
        </div>
      )}
    </>
  );
}
