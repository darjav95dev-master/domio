import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { ApiKeysPageClient } from "@/features/api-keys/components/api-keys-page-client";

/**
 * API Keys — Gestión de claves de acceso a la API pública.
 *
 * Only ADMIN can view this page.
 * The ApiKeysPageClient component handles all client-side interactivity.
 */
export default async function ApiKeysPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/panel/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/panel");
  }

  return <ApiKeysPageClient />;
}
