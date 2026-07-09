"use server";

import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { MediaService } from "@/infrastructure/media/media.service";
import { mediaAssets } from "@/infrastructure/db/schema/media-assets";
import {
  uploadMediaSchema,
  deleteMediaSchema,
  reorderMediaSchema,
  setCoverSchema,
} from "@/shared/types/media-schema";
import type { MediaAsset } from "@/infrastructure/db/schema/media-assets";
import type { MediaKind } from "@/infrastructure/media/types";

const UNAUTHORIZED_MSG = "No autorizado";
const INVALID_DATA_MSG = "Datos inválidos";

// ---------------------------------------------------------------------------
// T005 — Upload a media asset (image gallery or plan)
// ---------------------------------------------------------------------------

export async function uploadMediaAction(
  promocionId: string,
  kind: string,
  file: File,
  altText: string,
): Promise<
  | { success: true; asset: MediaAsset; previewUrl: string }
  | { success: false; error: string; issues?: Array<{ path: string; message: string }> }
> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: UNAUTHORIZED_MSG };
    }

    // Validate input against Zod schema
    const validation = uploadMediaSchema.safeParse({
      promocionId,
      kind,
      altText,
    });
    if (!validation.success) {
      return {
        success: false,
        error: INVALID_DATA_MSG,
        issues: validation.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      };
    }

    const mediaService = new MediaService(new AuthenticatedContext(session.tenantId, session.userId, session.role));
    // jsdom no implementa File.arrayBuffer — usamos new Response como workaround
    const buffer = Buffer.from(await new Response(file).arrayBuffer());

    const asset = await mediaService.uploadImage({
      file: buffer,
      fileName: file.name,
      mimeType: file.type,
      altText: validation.data.altText,
      kind: validation.data.kind as MediaKind,
      ownerId: promocionId,
    });

    const previewUrl = mediaService.getPublicUrl(asset.r2Key);

    return { success: true, asset, previewUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al subir el archivo",
    };
  }
}

// ---------------------------------------------------------------------------
// T006 — Delete a media asset
// ---------------------------------------------------------------------------

export async function deleteMediaAction(
  promocionId: string,
  assetId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: UNAUTHORIZED_MSG };
    }

    // Validate input
    const validation = deleteMediaSchema.safeParse({ promocionId, assetId });
    if (!validation.success) {
      return {
        success: false,
        error: INVALID_DATA_MSG,
      };
    }

    // Verify asset belongs to the specified promotion before deleting
    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    await authCtx.withTransaction(async (tx) => {
      const [asset] = await tx
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.id, assetId),
            eq(mediaAssets.ownerId, promocionId),
          ),
        );

      if (!asset) {
        throw new Error("El asset no pertenece a esta promoción");
      }
    });

    const mediaService = new MediaService(new AuthenticatedContext(session.tenantId, session.userId, session.role));
    await mediaService.delete(assetId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar el archivo",
    };
  }
}

// ---------------------------------------------------------------------------
// T007 — Reorder media assets (gallery or plans)
// ---------------------------------------------------------------------------

export async function reorderMediaAction(
  promocionId: string,
  kind: string,
  orderedAssetIds: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: UNAUTHORIZED_MSG };
    }

    // Validate input
    const validation = reorderMediaSchema.safeParse({
      promocionId,
      kind,
      orderedAssetIds,
    });
    if (!validation.success) {
      return {
        success: false,
        error: INVALID_DATA_MSG,
      };
    }

    const mediaService = new MediaService(new AuthenticatedContext(session.tenantId, session.userId, session.role));
    await mediaService.reorderGallery(promocionId, orderedAssetIds);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al reordenar",
    };
  }
}

// ---------------------------------------------------------------------------
// T008 — Set a gallery image as cover
// ---------------------------------------------------------------------------

export async function setCoverAction(
  promocionId: string,
  assetId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: UNAUTHORIZED_MSG };
    }

    // Validate input
    const validation = setCoverSchema.safeParse({ promocionId, assetId });
    if (!validation.success) {
      return {
        success: false,
        error: INVALID_DATA_MSG,
      };
    }

    const mediaService = new MediaService(new AuthenticatedContext(session.tenantId, session.userId, session.role));
    await mediaService.setCover(promocionId, assetId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al marcar portada",
    };
  }
}

// ---------------------------------------------------------------------------
// T009 — Validate that a promotion is ready to be published
//         (at least 1 gallery image + all assets have alt_text)
// ---------------------------------------------------------------------------

export async function validateMediaForPublish(
  promocionId: string,
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { valid: false, errors: [UNAUTHORIZED_MSG] };
    }

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    const assets = await authCtx.withTransaction(async (tx) => {
      return tx
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.ownerId, promocionId));
    });

    const errors: string[] = [];

    // Check: at least one IMAGE_GALLERY exists
    const galleryImages = assets.filter((a) => a.kind === "IMAGE_GALLERY");
    if (galleryImages.length === 0) {
      errors.push("Debe subir al menos una imagen de galería");
    }

    // Check: all gallery images have non-empty altText
    const imagesWithoutAlt = galleryImages.filter(
      (a) => !a.altText || a.altText.trim().length === 0,
    );
    if (imagesWithoutAlt.length > 0) {
      errors.push("Todas las imágenes deben tener texto alternativo");
    }

    // Check: all plans have non-empty altText
    const plans = assets.filter((a) => a.kind === "PLAN");
    const plansWithoutAlt = plans.filter(
      (a) => !a.altText || a.altText.trim().length === 0,
    );
    if (plansWithoutAlt.length > 0) {
      errors.push("Todos los planos deben tener texto alternativo");
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    return {
      valid: false,
      errors: [
        error instanceof Error
          ? error.message
          : "Error al validar los medios de la promoción",
      ],
    };
  }
}
