import { type NextRequest } from "next/server";
import { requireAuth } from "@/infrastructure/auth/require-auth";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { PromocionHistoryRepository } from "@/infrastructure/db/repositories/promocion-history.repository";

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
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;

    const promocionRepo = new PromocionRepository(auth.ctx);
    const historyRepo = new PromocionHistoryRepository(auth.ctx);

    // Verify promoción exists and check AGENT scope
    const current = await promocionRepo.findById(id);

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

    // Fetch history with author names (joined in repository)
    const historyItems = await historyRepo.getHistory(id);

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
