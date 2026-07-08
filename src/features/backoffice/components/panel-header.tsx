import { getServerSession } from "@/infrastructure/auth/session";
import { signOut } from "@/infrastructure/auth/auth.config";

/**
 * PanelHeader — top bar of the backoffice panel.
 *
 * Server component that reads the current session, displays the user's name
 * (or email fallback), and provides a logout button via a server action.
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

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <header className="flex items-center justify-between border-b border-border-default px-6 py-3">
      <span className="text-base font-medium text-fg-default">{displayName}</span>

      <form action={handleSignOut}>
        <button
          type="submit"
          aria-label="Cerrar sesión"
          className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors duration-quick ease-standard hover:bg-accent-subtle hover:text-accent-default focus-visible:outline-offset-[-2px]"
        >
          Cerrar sesión
        </button>
      </form>
    </header>
  );
}
