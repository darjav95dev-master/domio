import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
  | { success: true; data: T; warning?: string };

export type AdminAuth =
  | { authorized: true; ctx: AuthenticatedContext }
  | { authorized: false; result: ActionResult<never> };

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Ensures the current session belongs to an ADMIN user.
 * Returns an error result if not, or the AuthenticatedContext if authorized.
 */
export async function requireAdmin(): Promise<AdminAuth> {
  const session = await getServerSession();

  if (!session) {
    return {
      authorized: false,
      result: { success: false as const, error: "No autenticado" },
    };
  }

  if (session.role !== "ADMIN") {
    return {
      authorized: false,
      result: {
        success: false as const,
        error: "Acceso denegado: solo administradores",
      },
    };
  }

  const ctx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );

  return { authorized: true, ctx };
}
