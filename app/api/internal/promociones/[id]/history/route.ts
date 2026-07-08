import { type NextRequest } from "next/server";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";

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
 * GET /api/internal/promociones/[id]/history
 *
 * Returns the audit history for a promoción, including author names,
 * sorted by createdAt DESC (most recent first).
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

    // Verify promoción exists and check AGENT scope
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

    // Fetch history with author names (joined in repository)
    const historyItems = await repository.getHistory(id);

    return Response.json(
      {
        items: historyItems,
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
