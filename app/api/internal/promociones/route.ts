import { type NextRequest } from "next/server";
import { requireAuth } from "@/infrastructure/auth/require-auth";
import { PromocionRepository, type CursorResult } from "@/infrastructure/db/repositories/promocion.repository";
import { PromocionCreateSchema } from "@/shared/schemas/promocion.schema";
import {
  DEFAULT_PAGE_SIZE,
} from "@/shared/constants/domain-config";
import type { PromocionFilters } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// GET /api/internal/promociones
// Listado paginado con cursor o con offset (legacy)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
    const repository = new PromocionRepository(auth.ctx);

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

    // Cursor-based pagination
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(1, Number(limitParam)), 100)
      : DEFAULT_PAGE_SIZE;

    const result: CursorResult = await repository.findAllWithCursor(filters, {
      cursor: cursor ?? "",
      limit,
    });

    return Response.json(
      {
        items: result.items,
        nextCursor: result.nextCursor,
        total: result.total,
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
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
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

    const repository = new PromocionRepository(auth.ctx);
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
