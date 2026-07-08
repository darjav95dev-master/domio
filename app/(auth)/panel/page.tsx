import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { DashboardRepository } from "@/infrastructure/db/repositories/dashboard.repository";
import { DashboardContent } from "@/features/backoffice/components/dashboard-content";

/**
 * DashboardPage — operativo de bienvenida del backoffice.
 *
 * **Data flow:**
 * 1. Obtiene la sesión del servidor (defensa en profundidad — el layout ya protege la ruta).
 * 2. Crea un AuthenticatedContext desde la sesión para las queries multi-tenant.
 * 3. Consulta leads no leídos y últimas promociones editadas en paralelo.
 * 4. Renderiza DashboardContent con los datos obtenidos.
 *
 * **Resiliencia:** si las consultas a BD fallan, se renderiza con estado vacío
 * (0 leads no leídos, lista vacía de promociones).
 *
 * **Multi-tenant discipline:**
 * - DashboardRepository extiende TenantAwareRepository y recibe AuthenticatedContext.
 * - Cada método usa withTransaction() que establece SET LOCAL app.current_tenant_id
 *   y app.current_user_id antes de ejecutar la query.
 *
 * @see spec.md — User Story 3 (Dashboard operativo)
 * @see architecture.md §2.2, §2.3, §9 — SET LOCAL obligatorio en transacción
 */
export default async function DashboardPage() {
  const session = await getServerSession();

  // ── Auth guard (defence-in-depth) ──────────────────────────────────
  // The parent layout at `app/(auth)/panel/layout.tsx` already redirects
  // unauthenticated users. This check ensures the page is safe even if
  // the layout guard is bypassed in the future.
  if (!session) {
    redirect("/panel/login");
  }

  // ── Multi-tenant context ───────────────────────────────────────────
  // Build an AuthenticatedContext from the session. This context will be
  // used by the repository to SET LOCAL app.current_tenant_id and
  // app.current_user_id inside every transaction.
  const authCtx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const repo = new DashboardRepository(authCtx);

  // ── Data fetching ──────────────────────────────────────────────────
  let unreadLeadsCount = 0;
  let recentPromociones: Array<{
    id: string;
    name: string;
    status: string;
    updatedAt: Date;
  }> = [];

  try {
    [unreadLeadsCount, recentPromociones] = await Promise.all([
      repo.getUnreadLeadsCount(),
      repo.getRecentPromociones(5),
    ]);
  } catch {
    // Graceful degradation: render empty state if DB queries fail.
    // The error boundary at the layout level will catch unexpected crashes;
    // here we prefer showing a functional (though empty) dashboard
    // over an error screen.
  }

  return (
    <DashboardContent
      userName={session.name ?? session.userId}
      userRole={session.role}
      unreadLeadsCount={unreadLeadsCount}
      recentPromociones={recentPromociones}
    />
  );
}
