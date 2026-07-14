"use client";

import { signOut } from "next-auth/react";

/**
 * Botón de cerrar sesión.
 *
 * Antes era un <form method="POST"> plano contra /api/auth/signout. NextAuth v4
 * exige un token CSRF en ese POST; sin él, redirige a su página de confirmación
 * (/api/auth/signout?csrf=true) en vez de cerrar la sesión. signOut() de
 * next-auth/react lo adjunta y respeta el callbackUrl.
 */
export function LogoutButton() {
  return (
    <button
      type="button"
      aria-label="Cerrar sesión"
      onClick={() => signOut({ callbackUrl: "/panel/login" })}
      className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors duration-quick ease-standard hover:bg-accent-subtle hover:text-accent-default focus-visible:outline-offset-[-2px]"
    >
      Cerrar sesión
    </button>
  );
}
