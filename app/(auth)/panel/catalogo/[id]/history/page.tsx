import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { HistoryPanel } from "@/features/promociones/components/history-panel";

/**
 * HistoryPage — Página de histórico de cambios de una promoción.
 *
 * Server component con auth guard. Obtiene el nombre de la promoción
 * para el encabezado y renderiza el panel de histórico.
 *
 * Renderiza:
 * 1. Enlace de vuelta a la página de edición
 * 2. Título con el nombre de la promoción
 * 3. HistoryPanel con los cambios registrados
 *
 * **A11y:**
 * - Navegación semántica con back link
 * - `role="heading"` en el título
 */
export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/panel/login");
  }

  const { id } = await params;

  // ── Fetch promoción for heading ──────────────────────────────────────

  const authCtx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const repository = new PromocionRepository(authCtx);
  const raw = await repository.findById(id);

  if (!raw) {
    redirect("/panel/catalogo");
  }

  // AGENT role scope
  if (
    session.role === "AGENT" &&
    raw.assignedAgentId !== session.userId
  ) {
    redirect("/panel/catalogo");
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Back link to edit page */}
      <Link
        href={`/panel/catalogo/${id}`}
        className="inline-flex items-center gap-1 font-sans text-sm text-fg-subtle underline underline-offset-4 transition-colors duration-standard ease-standard hover:text-accent-default"
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Volver a edición
      </Link>

      {/* Heading */}
      <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-fg-default">
        Historial de cambios
      </h1>
      <p className="font-sans text-sm text-fg-subtle">
        {raw.name}
      </p>

      {/* History panel */}
      <HistoryPanel promocionId={id} />
    </div>
  );
}
