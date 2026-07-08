import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { ContactConfigRepository } from "@/features/contenidos/server/contact-config.repository";
import { ContactConfigForm } from "@/features/contenidos/components/ContactConfigForm";
import { ErrorBoundary } from "@/shared/components/error-boundary";

/**
 * ContactConfigPage — formulario de configuración de contacto global.
 *
 * **Auth guard:** defence-in-depth — el layout ya protege /panel/*.
 * **Role guard:** solo ADMIN y OPERATOR pueden acceder.
 * **Data:** carga la configuración existente (null si no existe) y se la pasa
 *           al formulario cliente.
 *
 * @see spec.md — User Story 2 (US2)
 * @see tasks.md — T033
 */
export default async function ContactConfigPage() {
  const session = await getServerSession();

  // ── Auth guard (defence-in-depth) ──────────────────────────────────
  if (!session) {
    redirect("/panel/login");
  }

  // ── Role guard ─────────────────────────────────────────────────────
  if (session.role !== "ADMIN" && session.role !== "OPERATOR") {
    redirect("/panel");
  }

  // ── Fetch existing contact config ──────────────────────────────────
  const authCtx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const repo = new ContactConfigRepository(authCtx);
  const contact = await repo.findByTenant(session.tenantId);

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* Header with back link */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-fg-default">
            Configuración de Contacto
          </h1>
          <Link
            href="/panel/contenidos"
            className="font-sans text-sm text-accent-default hover:underline"
          >
            &larr; Volver a contenidos
          </Link>
        </div>

        {/* Form */}
        <ContactConfigForm initialData={contact} />
      </div>
    </ErrorBoundary>
  );
}
