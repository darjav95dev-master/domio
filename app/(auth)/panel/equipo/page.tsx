import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { TeamPageClient } from "@/features/team/components/team-page-client";

/**
 * Equipo — Gestión de usuarios del tenant.
 *
 * Only ADMIN can view this page.
 * The TeamPageClient component handles all client-side interactivity.
 */
export default async function EquipoPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/panel/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/panel");
  }

  return <TeamPageClient />;
}
