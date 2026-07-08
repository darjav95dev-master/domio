import { type NextRequest } from "next/server";
import { getServerSession } from "@/infrastructure/auth/session";
import { revertContent } from "@/features/contenidos/actions/content-history.actions";

// ---------------------------------------------------------------------------
// POST /api/internal/content/revert
// Revierte un contenido (bloque o contacto) a una versión histórica
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "ADMIN" && session.role !== "OPERATOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { historyId } = body;

    if (!historyId) {
      return Response.json(
        { error: "Missing required field: historyId" },
        { status: 400 },
      );
    }

    const result = await revertContent(historyId);

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: 400 },
      );
    }

    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
