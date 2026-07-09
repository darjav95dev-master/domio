import { NextRequest } from "next/server";
import { requireAuth } from "@/infrastructure/auth/require-auth";
import { ContactConfigRepository } from "@/features/contenidos/server/contact-config.repository";
import { saveContactConfig } from "@/features/contenidos/actions/contact-config.actions";

// ---------------------------------------------------------------------------
// GET /api/internal/content/contact
// Obtiene la configuración de contacto global del tenant
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  if (auth.ctx.role !== "ADMIN" && auth.ctx.role !== "OPERATOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const repo = new ContactConfigRepository(auth.ctx);
    const contact = await repo.findByTenant(auth.ctx.getTenantId());

    return Response.json({ contact }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/internal/content/contact
// Crea o actualiza la configuración de contacto global (upsert)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  if (auth.ctx.role !== "ADMIN" && auth.ctx.role !== "OPERATOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const result = await saveContactConfig(body);

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
