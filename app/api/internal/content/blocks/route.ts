import { type NextRequest } from "next/server";
import { requireAuth } from "@/infrastructure/auth/require-auth";
import { ContentBlockRepository } from "@/features/contenidos/server/content-block.repository";
import { saveContentBlock } from "@/features/contenidos/actions/content-block.actions";
import type { PageKey } from "@/shared/types/content.types";

// ---------------------------------------------------------------------------
// GET /api/internal/content/blocks?pageKey=
// Lista bloques de contenido para una página específica
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  if (auth.ctx.role !== "ADMIN" && auth.ctx.role !== "OPERATOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const pageKey = url.searchParams.get("pageKey");

  if (!pageKey) {
    return Response.json(
      { error: "Missing required query parameter: pageKey" },
      { status: 400 },
    );
  }

  try {
    const repo = new ContentBlockRepository(auth.ctx);
    const blocks = await repo.findByTenantAndPage(
      auth.ctx.getTenantId(),
      pageKey as PageKey,
    );

    return Response.json({ blocks }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/internal/content/blocks
// Crea o actualiza un bloque de contenido (upsert)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  if (auth.ctx.role !== "ADMIN" && auth.ctx.role !== "OPERATOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { pageKey, blockKey, payload } = body;

    if (!pageKey || !blockKey || !payload) {
      return Response.json(
        {
          error: "Missing required fields: pageKey, blockKey, payload",
        },
        { status: 400 },
      );
    }

    const result = await saveContentBlock(pageKey, blockKey, payload);

    if (!result.success) {
      return Response.json(
        { error: result.error, details: result.details },
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
