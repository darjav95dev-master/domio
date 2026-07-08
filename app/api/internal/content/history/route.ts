import { type NextRequest } from "next/server";
import { getServerSession } from "@/infrastructure/auth/session";
import { getContentHistory } from "@/features/contenidos/actions/content-history.actions";
import type { ContentType } from "@/shared/types/content.types";

// ---------------------------------------------------------------------------
// GET /api/internal/content/history?contentType=&contentKey=&limit=
// Lista el historial de versiones de un contenido (bloque o contacto)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "ADMIN" && session.role !== "OPERATOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const contentType = url.searchParams.get("contentType");
  const contentKey = url.searchParams.get("contentKey");
  const limitParam = url.searchParams.get("limit");

  if (!contentType || !contentKey) {
    return Response.json(
      {
        error: "Missing required query parameters: contentType, contentKey",
      },
      { status: 400 },
    );
  }

  try {
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const result = await getContentHistory(
      contentType as ContentType,
      contentKey,
      limit,
    );

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: 400 },
      );
    }

    return Response.json({ history: result.data }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
