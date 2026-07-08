"use server";

import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { contentBlockSchema } from "@/shared/types/content-block-schema";
import type { ContentBlockType } from "@/shared/constants/db-enums";

const UNAUTHORIZED_MSG = "No autorizado";

/**
 * Upserts a content block for a promotion (creates or updates).
 * Validates the payload against the Zod schema for the given blockType
 * on the server side, then delegates to the repository.
 */
export async function upsertContentBlockAction(
  promocionId: string,
  blockType: ContentBlockType,
  payload: Record<string, unknown>,
): Promise<{
  success: boolean;
  block?: { id: string; blockType: string; payload: Record<string, unknown>; sortOrder: number };
  error?: string;
  issues?: Array<{ path: string; message: string }>;
}> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: UNAUTHORIZED_MSG };
    }

    // Validate payload against Zod schema
    const validation = contentBlockSchema.safeParse({ blockType, payload });
    if (!validation.success) {
      return {
        success: false,
        error: "Datos inválidos",
        issues: validation.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      };
    }

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );
    const repository = new PromocionRepository(authCtx);

    const block = await repository.upsertContentBlock(
      promocionId,
      blockType,
      payload,
      session.userId,
    );

    return {
      success: true,
      block: {
        id: block.id,
        blockType: block.blockType,
        payload: block.payload as Record<string, unknown>,
        sortOrder: block.sortOrder,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al guardar el bloque",
    };
  }
}

/**
 * Deletes a content block and reindexes the sort_order of remaining blocks.
 */
export async function deleteContentBlockAction(
  promocionId: string,
  blockId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: UNAUTHORIZED_MSG };
    }

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );
    const repository = new PromocionRepository(authCtx);

    await repository.deleteContentBlock(promocionId, blockId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar el bloque",
    };
  }
}

/**
 * Reorders content blocks atomically.
 * Accepts an array of block IDs in the new desired order.
 */
export async function reorderContentBlocksAction(
  promocionId: string,
  orderedBlockIds: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: UNAUTHORIZED_MSG };
    }

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );
    const repository = new PromocionRepository(authCtx);

    await repository.reorderContentBlocks(promocionId, orderedBlockIds);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al reordenar los bloques",
    };
  }
}
