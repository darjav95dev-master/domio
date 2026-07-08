"use server";

import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { ContentService } from "../server/content.service";
import { ContentBlockRepository } from "../server/content-block.repository";
import { ContactConfigRepository } from "../server/contact-config.repository";
import { ContentHistoryRepository } from "../server/content-history.repository";
import type { PageKey, BlockKey } from "@/shared/types/content.types";

/**
 * Server action that saves (upserts) a content block for the given page and block keys.
 *
 * Validates:
 *  - User is authenticated (session exists)
 *  - User has ADMIN or OPERATOR role
 *  - Payload is validated by ContentService against the block-specific Zod schema
 *
 * Returns `{ success: true }` on success, or `{ success: false, error, details }` on failure.
 */
export async function saveContentBlock(
  pageKey: PageKey,
  blockKey: BlockKey,
  payload: Record<string, unknown>,
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

  return service.saveBlock(
    session.tenantId,
    pageKey,
    blockKey,
    payload,
    session.userId,
  );
}
