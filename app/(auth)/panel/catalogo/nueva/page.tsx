export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";

/**
 * NuevaPromocionPage — crea una promoción vacía en estado DRAFT y
 * redirige a la página de edición.
 *
 * Server component (no tiene UI propia). Crea la promoción vía
 * PromocionRepository.create con los valores mínimos (name="Nueva
 * promoción", kind="portfolio") y redirige a `/panel/catalogo/[id]`.
 *
 * **Auth guard:** defence-in-depth — verifica la sesión además del
 * middleware y layout.
 */
export default async function NuevaPromocionPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/panel/login");
  }

  const authCtx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );

  const repository = new PromocionRepository(authCtx);

  const created = await repository.create({
    name: "Nueva promoción",
    kind: "portfolio",
    // AGENT: auto-assign themselves so they can see it after creation
    ...(session.role === "AGENT" ? { assignedAgentId: session.userId } : {}),
  });

  // Redirect to the edit page for the new promoción
  redirect(`/panel/catalogo/${created.id}`);
}
