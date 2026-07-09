import type { UserRole } from "@/shared/constants/db-enums";
import { getServerSession as nextAuthGetSession } from "next-auth";
import { authConfig } from "./auth.config";

export interface ServerSession {
  userId: string;
  tenantId: string;
  role: UserRole;
  name: string | null;
}

/**
 * Retrieves the current server-side session and returns a typed object
 * with the user's identity, tenant, role, and name.
 *
 * Returns `null` if no session exists or the session has no user data.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  let session: Awaited<ReturnType<typeof nextAuthGetSession>>;
  try {
    session = await nextAuthGetSession(authConfig);
  } catch {
    return null;
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user as {
    id?: string;
    tenant_id?: string;
    role?: string;
    name?: string | null;
  };

  if (!user.id || !user.tenant_id || !user.role) {
    return null;
  }

  return {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role as UserRole,
    name: user.name ?? null,
  };
}
