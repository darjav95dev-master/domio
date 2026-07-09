import { validateApiKey } from "@/features/api-public/middleware/api-key-auth";
import { getPromociones } from "@/features/api-public/server/get-promociones";
import { serializePromocion } from "@/features/api-public/serializers/promocion-serializer";
import {
  createRateLimitResponse,
  addRateLimitHeaders,
} from "@/infrastructure/rate-limiting/api-key-middleware";
import { applyRateLimit } from "@/features/api-public/with-rate-limit";
import { ContextResolutionError } from "@/infrastructure/tenant/context-middleware";
import { logger } from "@/shared/utils/logger";

// ---------------------------------------------------------------------------
// GET /api/v1/promociones
//
// Retorna la lista de promociones del portafolio institucional (kind=portfolio)
// con status=PUBLISHED, paginada por cursor y serializada respetando el modo
// de privacidad del mapa.
//
// Requiere autenticación por API key via header X-API-Key o Authorization: Bearer.
// Rate limiting por API key.
// ---------------------------------------------------------------------------

async function handler(request: Request): Promise<Response> {
  try {
    // 1. Authenticate via API key
    const ctx = await validateApiKey(request);

    // 2. Rate limit check (runs after auth — auth provides the API key ID)
    const rateCheck = await applyRateLimit(ctx.apiKeyId, ctx.rateLimitPerMin);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.result);
    }

    // 3. Parse query params
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    // 4. Fetch promociones with cursor pagination
    const result = await getPromociones({
      ctx,
      cursor,
      limit,
    });

    // 5. Serialize each promocion
    const items = result.items.map(serializePromocion);

    // 6. Build response with rate limit headers
    const body = {
      items,
      nextCursor: result.nextCursor,
      total: result.total,
    };

    return addRateLimitHeaders(Response.json(body, { status: 200 }), rateCheck.result);
  } catch (error) {
    if (error instanceof ContextResolutionError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    logger.error(
      "Error in GET /api/v1/promociones:",
      error instanceof Error ? error.message : String(error),
    );

    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = handler;
