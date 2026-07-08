import { NextRequest } from "next/server";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { ContactConfigRepository } from "@/features/contenidos/server/contact-config.repository";
import { saveContactConfig } from "@/features/contenidos/actions/contact-config.actions";

// ---------------------------------------------------------------------------
// GET /api/internal/content/contact
// Obtiene la configuración de contacto global del tenant
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "ADMIN" && session.role !== "OPERATOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    const repo = new ContactConfigRepository(authCtx);
    const contact = await repo.findByTenant(session.tenantId);

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
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "ADMIN" && session.role !== "OPERATOR") {
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
