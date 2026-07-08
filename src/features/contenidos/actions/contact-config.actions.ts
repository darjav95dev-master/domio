"use server";

import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { ContentService } from "../server/content.service";
import { ContentBlockRepository } from "../server/content-block.repository";
import { ContactConfigRepository } from "../server/contact-config.repository";
import { ContentHistoryRepository } from "../server/content-history.repository";

export interface ContactConfigInput {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hours?: string | null;
  whatsappNumber?: string | null;
  whatsappPrefilledMessage?: string | null;
}

/**
 * Server action that saves (upserts) the global contact configuration for the
 * current tenant.
 *
 * Validates:
 *  - User is authenticated (session exists)
 *  - User has ADMIN or OPERATOR role
 *  - Contact data is validated by ContentService against the Zod schema
 *
 * Returns `{ success: true }` on success, or
 * `{ success: false, error, details }` on failure.
 */
export async function saveContactConfig(
  data: ContactConfigInput,
): Promise<{ success: boolean; error?: string; details?: unknown }> {
  const session = await getServerSession();
  if (!session) {
    return { success: false, error: "No autorizado" };
  }

  if (session.role !== "ADMIN" && session.role !== "OPERATOR") {
    return { success: false, error: "No tienes permiso para realizar esta acción" };
  }

  const authCtx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );

  const service = new ContentService(
    new ContentBlockRepository(authCtx),
    new ContactConfigRepository(authCtx),
    new ContentHistoryRepository(authCtx),
  );

  return service.saveContactConfig(
    session.tenantId,
    data,
    session.userId,
  );
}
