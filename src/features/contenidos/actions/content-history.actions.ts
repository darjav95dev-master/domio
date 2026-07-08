"use server";

import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { ContentService } from "../server/content.service";
import { ContentBlockRepository } from "../server/content-block.repository";
import { ContactConfigRepository } from "../server/contact-config.repository";
import { ContentHistoryRepository } from "../server/content-history.repository";
import type { ContentType } from "@/shared/types/content.types";
import type { HistoryEntry } from "../components/ContentHistoryView";

/**
 * Retrieves the content history for a given content type and key,
 * enriched with the user's display name.
 *
 * Requires ADMIN or OPERATOR role.
 * Returns a list of history entries ordered by created_at DESC.
 */
export async function getContentHistory(
  contentType: ContentType,
  contentKey: string,
  limit?: number,
): Promise<{ success: boolean; data?: HistoryEntry[]; error?: string }> {
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

  const repo = new ContentHistoryRepository(authCtx);
  const rows = await repo.findByContentWithUser(
    session.tenantId,
    contentType,
    contentKey,
    limit,
  );

  const data: HistoryEntry[] = rows.map((row) => ({
    id: row.id,
    contentType: row.contentType as ContentType,
    contentKey: row.contentKey,
    payloadSnapshot: row.payloadSnapshot ?? {},
    updatedBy: row.updatedByName ? { name: row.updatedByName } : null,
    createdAt: row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : String(row.createdAt),
  }));

  return { success: true, data };
}

/**
 * Reverts content (block or contact config) to a specific history version.
 *
 * Requires ADMIN or OPERATOR role.
 * Creates a new history entry as a record of the revert operation.
 */
export async function revertContent(
  historyId: string,
): Promise<{ success: boolean; error?: string }> {
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

  const result = await service.revert(session.tenantId, historyId, session.userId);

  return { success: result.success, error: result.error };
}
