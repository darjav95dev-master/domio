import { getServerSession } from "@/infrastructure/auth/session";
import { generateOpenAPISpec } from "@/features/api-public/openapi/generate-openapi";

// ---------------------------------------------------------------------------
// GET /api/internal/docs
//
// Returns the OpenAPI 3.0 specification for the Domio API v1.
// Requires a valid backoffice session (admin or operator).
// Without authentication, returns 401 Unauthorized.
// ---------------------------------------------------------------------------

export async function GET(): Promise<Response> {
  const session = await getServerSession();

  if (!session) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const spec = generateOpenAPISpec();

  return Response.json(spec, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
