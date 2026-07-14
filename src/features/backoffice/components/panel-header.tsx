import { getServerSession } from "@/infrastructure/auth/session";
import { LogoutButton } from "@/features/backoffice/components/logout-button";

/**
 * PanelHeader — top bar of the backoffice panel.
 *
 * Server component que lee la sesión y muestra el nombre del usuario. El cierre
 * de sesión lo hace LogoutButton (cliente), que redirige a /panel/login.
 *
 * Styling: border-bottom subtle divider, compact padding, flex space-between.
 */
export default async function PanelHeader() {
  const session = await getServerSession();

  // The parent layout (T008) already guards against null session, but we
  // keep this as a safety net per the redundancy principle (§2 defence-in-depth).
  if (!session) {
    return null;
  }

  const displayName = session.name ?? "Usuario";

  return (
    <header className="flex items-center justify-between border-b border-border-default px-6 py-3">
      <span className="text-base font-medium text-fg-default">{displayName}</span>

      <LogoutButton />
    </header>
  );
}
