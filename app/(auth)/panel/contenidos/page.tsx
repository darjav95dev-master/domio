import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { ContenidosPageClient } from "@/features/contenidos/components/ContenidosPageClient";
import { ErrorBoundary } from "@/shared/components/error-boundary";

/**
 * ContenidosPage — panel de selección de páginas editables.
 *
 * **Auth guard:** defence-in-depth — el layout ya protege /panel/*.
 * **Role guard:** solo ADMIN y OPERATOR pueden acceder.
 * **UI:** renderiza ContenidosPageClient que lista las páginas disponibles.
 *
 * @see spec.md — User Story 1
 * @see tasks.md — T024
 */
export default async function ContenidosPage() {
  const session = await getServerSession();

  // ── Auth guard (defence-in-depth) ──────────────────────────────────
  if (!session) {
    redirect("/panel/login");
  }

  // ── Role guard ─────────────────────────────────────────────────────
  if (session.role !== "ADMIN" && session.role !== "OPERATOR") {
    redirect("/panel");
  }

  return (
    <ErrorBoundary>
      <ContenidosPageClient />
    </ErrorBoundary>
  );
}
