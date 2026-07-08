import { type NextRequest } from "next/server";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { PromocionDraftSchema } from "@/shared/schemas/promocion.schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ERR_NOT_FOUND = "Promoción not found";
const ERR_INTERNAL = "Internal server error";
const ERR_FORBIDDEN = "Forbidden";
const ERR_PARSE_BODY = "Invalid JSON body";
const ERR_UNAUTHENTICATED = "Unauthenticated";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * PATCH /api/internal/promociones/[id]/draft
 *
 * Updates ONLY the draftPayload column of a promoción.
 * Does NOT record history, does NOT trigger revalidation,
 * does NOT modify any other fields.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: ERR_UNAUTHENTICATED }, { status: 401 });
  }

  try {
    const { id } = await params;

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    // Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: ERR_PARSE_BODY },
        { status: 400 },
      );
    }

    // Validate with PromocionDraftSchema
    const parsed = PromocionDraftSchema.safeParse(body);

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

    // updateDraft ONLY touches draftPayload — no history, no revalidation
    const updated = await repository.updateDraft(id, parsed.data);

    return Response.json(
      {
        draftPayload: updated.draftPayload,
        updatedAt: updated.updatedAt,
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
 * DELETE /api/internal/promociones/[id]/draft
 *
 * Clears the draftPayload (sets to null) for a promoción.
 * Does NOT record history, does NOT trigger revalidation.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: ERR_UNAUTHENTICATED }, { status: 401 });
  }

  try {
    const { id } = await params;

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

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

    // Clear draftPayload by setting it to null
    const updated = await repository.updateDraft(id, null);

    return Response.json(
      {
        draftPayload: updated.draftPayload,
        updatedAt: updated.updatedAt,
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
