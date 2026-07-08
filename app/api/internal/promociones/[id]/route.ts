import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { PromocionWithTipologiasUpdateSchema } from "@/shared/schemas/promocion.schema";
import { generateSlug } from "@/infrastructure/slug/generate-slug";
import type { PromocionWithRelations } from "@/infrastructure/db/repositories/promocion.repository";
import type { PromocionUpdatePayload } from "@/shared/schemas/promocion.schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ERR_NOT_FOUND = "Promoción not found";
const ERR_INTERNAL = "Internal server error";
const ERR_FORBIDDEN = "Forbidden";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConstructionWarning {
  type: "CONSTRUCTION_WARNING";
  message: string;
  entregaEstimada: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes a soft warning when construction_status contradicts the
 * entrega_estimada from the PLAZOS_GARANTIAS content block.
 *
 * Rule (architecture.md §7.19): constructionStatus is authoritative.
 * The warning is non-blocking — the operator has the final word.
 */
function computeConstructionWarning(
  constructionStatus: string | null,
  blockPayload: Record<string, unknown> | null,
): ConstructionWarning | null {
  if (!constructionStatus || !blockPayload?.entrega_estimada) {
    return null;
  }

  const rawDate = blockPayload.entrega_estimada;
  const dateStr = typeof rawDate === "string" ? rawDate : "";
  if (!dateStr) return null;

  const entregaEstimada = new Date(dateStr);
  if (Number.isNaN(entregaEstimada.getTime())) return null;

  const now = new Date();
  const isPast = entregaEstimada < now;
  const isFuture = entregaEstimada > now;
  const formattedDate = entregaEstimada.toISOString().slice(0, 10);

  if (constructionStatus === "ON_PLAN" && isPast) {
    return {
      type: "CONSTRUCTION_WARNING" as const,
      message: `Marcado como sobre plano pero la fecha de entrega (${formattedDate}) ya ha pasado`,
      entregaEstimada: formattedDate,
    };
  }

  if (constructionStatus === "READY" && isFuture) {
    return {
      type: "CONSTRUCTION_WARNING" as const,
      message: `Marcado como terminado pero la fecha de entrega (${formattedDate}) está en el futuro`,
      entregaEstimada: formattedDate,
    };
  }

  if (constructionStatus === "IN_CONSTRUCTION" && isPast) {
    return {
      type: "CONSTRUCTION_WARNING" as const,
      message: `Marcado como en construcción pero la fecha de entrega (${formattedDate}) ya ha pasado`,
      entregaEstimada: formattedDate,
    };
  }

  return null;
}

/**
 * Returns the last 4 characters of a UUID to use as short identifier in the slug.
 */
function shortId(id: string): string {
  return id.slice(-4);
}

/**
 * Gets the number of bedrooms from the first tipologia, or 0 if none exist
 * (which produces "estudio" in the slug).
 */
function getFirstTipologiaBedrooms(
  tipologias: Array<{ bedrooms: number | null }>,
): number {
  if (tipologias.length === 0) return 0;
  return tipologias[0]?.bedrooms ?? 0;
}

/**
 * Prepares the update data for a PATCH request:
 *   - Merges draftPayload if publishing from draft
 *   - Generates slug if publishing for the first time
 *
 * Extracted to reduce cognitive complexity of the PATCH handler.
 */
interface PrepareUpdateParams {
  parsedData: PromocionUpdatePayload;
  current: PromocionWithRelations;
  id: string;
}

interface PreparedUpdate {
  data: Record<string, unknown>;
  resultingSlug: string | null;
}

function prepareUpdateData(params: PrepareUpdateParams): PreparedUpdate {
  const { parsedData, current, id } = params;

  const updateData: Record<string, unknown> = {
    ...parsedData,
  };

  const isPublishing =
    parsedData.status === "PUBLISHED" && current.status !== "PUBLISHED";

  // If publishing from draft, merge draftPayload fields
  if (isPublishing && current.draftPayload) {
    for (const [key, value] of Object.entries(current.draftPayload)) {
      if (!(key in updateData)) {
        updateData[key] = value;
      }
    }
    updateData.draftPayload = null;
  }

  // Generate slug if publishing for the first time
  let newSlug: string | null = null;
  if (isPublishing && !current.slug) {
    const propertyType =
      (updateData.propertyType as string) ?? current.propertyType ?? "";
    const operation =
      (updateData.operation as string) ?? current.operation ?? "";
    const municipality =
      (updateData.municipality as string) ?? current.municipality ?? "";
    const bedrooms = getFirstTipologiaBedrooms(current.tipologias);
    const slugId = shortId(id);

    newSlug = generateSlug(
      propertyType,
      operation,
      municipality,
      bedrooms,
      slugId,
    );

    updateData.slug = newSlug;
  }

  // Determine the resulting slug (after update) for revalidation
  const resultingSlug = newSlug ?? current.slug;

  return { data: updateData, resultingSlug };
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
 * Checks whether the PATCH is a publish action and if so, verifies that
 * all content blocks have valid payloads. Returns a 422 Response with
 * code "BLOCKS_INVALID" if any block is invalid, or null to proceed.
 *
 * Extracted to reduce cognitive complexity of the PATCH handler (FR-008).
 */
async function validateBlocksOnPublish(
  repository: PromocionRepository,
  promocionId: string,
  parsedData: PromocionUpdatePayload,
  current: PromocionWithRelations,
): Promise<Response | null> {
  const isPublishing =
    parsedData.status === "PUBLISHED" && current.status !== "PUBLISHED";

  if (!isPublishing) return null;

  const blockValidation = await repository.validateBlocksForPublish(promocionId);

  if (blockValidation.valid) return null;

  return Response.json(
    {
      code: "BLOCKS_INVALID",
      message:
        "Hay bloques editoriales con datos inválidos. Corrígelos antes de publicar.",
      details: blockValidation.errors.map((e) => ({
        blockId: e.blockId,
        blockType: e.blockType,
        issues: e.issues,
      })),
    },
    { status: 422 },
  );
}

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
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    const repository = new PromocionRepository(authCtx);
    const promocion = await repository.findById(id);

    if (!promocion) {
      return Response.json({ error: ERR_NOT_FOUND }, { status: 404 });
    }

    // AGENT role scope: only assigned promociones
    if (
      authCtx.role === "AGENT" &&
      promocion.assignedAgentId !== authCtx.userId
    ) {
      return Response.json(
        { error: ERR_FORBIDDEN },
        { status: 403 },
      );
    }

    // Compute constructionWarning from PLAZOS_GARANTIAS block
    const blockPayload = await repository.findContentBlock(
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
  } catch {
    return Response.json(
      { error: ERR_INTERNAL },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/internal/promociones/[id]
 * Updates a promoción. Handles slug generation on first publish,
 * draftPayload application, location conversion, and ISR revalidation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    // Parse and validate body
    // Uses PromocionWithTipologiasUpdateSchema so that optional tipologias
    // data passes through validation. Persistence of tipologias is handled
    // by the PATCH handler's repository logic.
    const body = await request.json();
    const parsed = PromocionWithTipologiasUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const repository = new PromocionRepository(authCtx);
    const current = await repository.findById(id);

    if (!current) {
      return Response.json({ error: ERR_NOT_FOUND }, { status: 404 });
    }

    // AGENT role scope: only assigned promociones
    if (
      authCtx.role === "AGENT" &&
      current.assignedAgentId !== authCtx.userId
    ) {
      return Response.json(
        { error: ERR_FORBIDDEN },
        { status: 403 },
      );
    }

    // Convert location from { lng, lat } to PostGIS [lng, lat] tuple
    if (parsed.data.location !== undefined) {
      const loc = parsed.data.location;
      (parsed.data as Record<string, unknown>).location =
        loc === null ? null : ([loc.lng, loc.lat] as [number, number]);
    }
    if (parsed.data.locationApprox !== undefined) {
      const loc = parsed.data.locationApprox;
      (parsed.data as Record<string, unknown>).locationApprox =
        loc === null ? null : ([loc.lng, loc.lat] as [number, number]);
    }

    const { data: updateData, resultingSlug } = prepareUpdateData({
      parsedData: parsed.data,
      current,
      id,
    });

    // FR-008: Re-check block validation on publish — the server component
    // computes publishBlocked on page-load, but the operator may have edited
    // blocks client-side since then, making the initial check stale.
    const blockResponse = await validateBlocksOnPublish(
      repository, id, parsed.data, current,
    );
    if (blockResponse) return blockResponse;

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
  } catch {
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
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Only ADMIN and OPERATOR can delete
    if (session.role === "AGENT") {
      return Response.json(
        { error: ERR_FORBIDDEN },
        { status: 403 },
      );
    }

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    const repository = new PromocionRepository(authCtx);

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
  } catch {
    return Response.json(
      { error: ERR_INTERNAL },
      { status: 500 },
    );
  }
}
