import { type NextRequest } from "next/server";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { PromocionCreateSchema } from "@/shared/schemas/promocion.schema";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/shared/constants/domain-config";
import type { PromocionFilters } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// GET /api/internal/promociones
// Listado paginado con filtros
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    const repository = new PromocionRepository(authCtx);

    // Parse query params using standard URL (works with plain Request in tests)
    const url = new URL(request.url);
    const filters: PromocionFilters = {};

    const status = url.searchParams.get("status");
    if (status) filters.status = status as PromocionFilters["status"];

    const kind = url.searchParams.get("kind");
    if (kind) filters.kind = kind as PromocionFilters["kind"];

    const island = url.searchParams.get("island");
    if (island) filters.island = island;

    const municipality = url.searchParams.get("municipality");
    if (municipality) filters.municipality = municipality;

    const assignedAgentId = url.searchParams.get("assignedAgentId");
    if (assignedAgentId) filters.assignedAgentId = assignedAgentId;

    const constructionStatus = url.searchParams.get("constructionStatus");
    if (constructionStatus) {
      filters.constructionStatus =
        constructionStatus as PromocionFilters["constructionStatus"];
    }

    // Pagination with defaults
    let page = Number(url.searchParams.get("page")) || 1;
    let limit = Number(url.searchParams.get("limit")) || DEFAULT_PAGE_SIZE;

    // Clamp page and limit
    if (page < 1) page = 1;
    if (limit < 1) limit = DEFAULT_PAGE_SIZE;
    if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;

    const result = await repository.findAll(filters, page, limit);

    return Response.json(
      {
        items: result.items,
        total: result.total,
        page,
        limit,
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/internal/promociones
// Crear una nueva promoción en estado DRAFT
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );

    // Parse and validate body
    const body = await request.json();
    const parsed = PromocionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const repository = new PromocionRepository(authCtx);
    const created = await repository.create({
      name: parsed.data.name,
      kind: parsed.data.kind,
    });

    return Response.json(created, { status: 201 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
