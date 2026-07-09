import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthResult =
  | { authorized: true; ctx: AuthenticatedContext }
  | { authorized: false; response: Response };

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Ensures the current request has a valid authenticated session.
 * Returns the AuthenticatedContext if authorized, or a 401 Response otherwise.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession();

  if (!session) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Unauthenticated" },
        { status: 401 },
      ),
    };
  }

  const ctx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );

  return { authorized: true, ctx };
}
