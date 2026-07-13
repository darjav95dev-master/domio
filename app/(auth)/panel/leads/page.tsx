import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { LeadRepository } from "@/infrastructure/db/repositories/lead.repository";
import { LeadReadMarkRepository } from "@/infrastructure/db/repositories/lead-read-mark.repository";
import { LeadsPageContent } from "@/features/leads/components/leads-page-content";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/domain-config";
import { logger } from "@/shared/utils/logger";
import type { LeadRow } from "@/infrastructure/db/repositories/lead.repository";

/**
 * LeadsPage — server component que carga los leads iniciales y delega
 * la interactividad (filtros, paginación, exportación) a LeadsPageContent.
 *
 * Auth guard: defence-in-depth (el layout ya redirige si no hay sesión).
 */
export default async function LeadsPage() {
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

  let initialLeads: LeadRow[] = [];
  let initialTotal = 0;
  let initialUnreadIds: string[] = [];

  try {
    const result = await repo.findAll({}, { page: 1, limit: DEFAULT_PAGE_SIZE });
    initialLeads = result.items;
    initialTotal = result.total;
    initialUnreadIds = await readMarkRepo.getUnreadLeadIds(session.userId);
  } catch (err) {
    logger.error("Failed to load leads:", err);
  }

  return (
    <LeadsPageContent
      initialLeads={initialLeads}
      initialTotal={initialTotal}
      initialPage={1}
      initialUnreadIds={initialUnreadIds}
    />
  );
}
