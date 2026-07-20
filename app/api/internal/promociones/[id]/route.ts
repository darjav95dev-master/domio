import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/infrastructure/auth/require-auth";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { PromocionContentBlockRepository } from "@/infrastructure/db/repositories/promocion-content-block.repository";
import { PromocionWithTipologiasUpdateSchema } from "@/shared/schemas/promocion.schema";
import { logger } from "@/shared/utils/logger";
import { computeConstructionWarning } from "@/shared/utils/construction-warning";
import { PromocionPublishService } from "@/features/promociones/server/promocion-publish.service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ERR_NOT_FOUND = "Promoción not found";
const ERR_INTERNAL = "Internal server error";
const ERR_FORBIDDEN = "Forbidden";

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/internal/promociones/[id]
 * Returns a single promoción with its tipologías, unidades, and
 * constructionWarning.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;

    const repository = new PromocionRepository(auth.ctx);
    const contentBlockRepo = new PromocionContentBlockRepository(auth.ctx);

    const promocion = await repository.findById(id);

    if (!promocion) {
      return Response.json({ error: ERR_NOT_FOUND }, { status: 404 });
    }

    // AGENT role scope: only assigned promociones
    if (
      auth.ctx.role === "AGENT" &&
      promocion.assignedAgentId !== auth.ctx.userId
    ) {
      return Response.json(
        { error: ERR_FORBIDDEN },
        { status: 403 },
      );
    }

    // Compute constructionWarning from PLAZOS_GARANTIAS block
    const blockPayload = await contentBlockRepo.findContentBlock(
      id,
      "PLAZOS_GARANTIAS",
    );
    const constructionWarning = computeConstructionWarning(
      promocion.constructionStatus,
      blockPayload,
    );

    return Response.json(
      {
        ...promocion,
        constructionWarning,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("GET promocion error", error);
    return Response.json(
      { error: ERR_INTERNAL },
      { status: 500 },
    );
  }
}

/**
 * Creates a validation error response with field-level details.
 */
function validationErrorResponse(
  issues: Array<{ path: ReadonlyArray<string | number | symbol>; message: string }>,
): Response {
  return Response.json(
    {
      error: "Validation failed",
      details: issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
    { status: 400 },
  );
}

/**
 * PATCH /api/internal/promociones/[id]
 * Updates a promoción. Delegates business logic to PromocionPublishService.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;

    const repository = new PromocionRepository(auth.ctx);
    const contentBlockRepo = new PromocionContentBlockRepository(auth.ctx);
    const publishService = new PromocionPublishService(
      repository,
      contentBlockRepo,
    );

    // Parse and validate body
    const body = await request.json();
    const parsed = PromocionWithTipologiasUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const current = await repository.findById(id);

    if (!current) {
      return Response.json({ error: ERR_NOT_FOUND }, { status: 404 });
    }

    // AGENT role scope: only assigned promociones
    if (
      auth.ctx.role === "AGENT" &&
      current.assignedAgentId !== auth.ctx.userId
    ) {
      return Response.json(
        { error: ERR_FORBIDDEN },
        { status: 403 },
      );
    }

    // Convert location fields from { lng, lat } to PostGIS [lng, lat] tuples
    publishService.convertLocationFields(parsed.data as Record<string, unknown>);

    const isPublishing =
      parsed.data.status === "PUBLISHED" && current.status !== "PUBLISHED";

    // AGENT role cannot publish — only ADMIN and OPERATOR can
    if (isPublishing && auth.ctx.role === "AGENT") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: updateData, resultingSlug } = publishService.prepareUpdateData(
      parsed.data,
      current,
      id,
      isPublishing,
    );

    // FR-008: Re-check block validation on publish
    const blockErrors = await publishService.validateBlocksOnPublish(id, isPublishing);
    if (blockErrors) {
      return Response.json(
        {
          code: "BLOCKS_INVALID",
          message:
            "Hay bloques editoriales con datos inválidos. Corrígelos antes de publicar.",
          details: blockErrors,
        },
        { status: 422 },
      );
    }

    // FR-009 / FR-010: Reject publish if media assets are invalid
    const mediaErrors = await publishService.validateMediaOnPublish(id, isPublishing);
    if (mediaErrors) {
      return Response.json(
        {
          code: "MEDIA_INVALID",
          message:
            "Hay medios con datos inválidos. Corrígelos antes de publicar.",
          details: mediaErrors,
        },
        { status: 422 },
      );
    }

    const updated = await repository.update(
      id,
      updateData as Parameters<typeof repository.update>[1],
    );

    // Revalidate cache if promoción has a slug (published)
    if (resultingSlug) {
      revalidateTag(`promocion:${resultingSlug}`);
      revalidateTag("catalog");
    }

    return Response.json(updated, { status: 200 });
  } catch (error) {
    logger.error("PATCH promocion error", error);
    return Response.json(
      { error: ERR_INTERNAL },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/internal/promociones/[id]
 * Deletes a promoción. Only ADMIN and OPERATOR roles.
 * Revalidates cache if the promoción was published.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;

    // Only ADMIN and OPERATOR can delete
    if (auth.ctx.role === "AGENT") {
      return Response.json(
        { error: ERR_FORBIDDEN },
        { status: 403 },
      );
    }

    const repository = new PromocionRepository(auth.ctx);

    // Fetch the promoción first to get the slug for revalidation
    const current = await repository.findById(id);

    if (!current) {
      return Response.json({ error: ERR_NOT_FOUND }, { status: 404 });
    }

    await repository.delete(id);

    // Revalidate if the promoción was published
    if (current.slug) {
      revalidateTag(`promocion:${current.slug}`);
      revalidateTag("catalog");
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error("DELETE promocion error", error);
    return Response.json(
      { error: ERR_INTERNAL },
      { status: 500 },
    );
  }
}
