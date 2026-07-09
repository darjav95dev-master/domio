import { validateApiKey } from "@/features/api-public/middleware/api-key-auth";
import { createInstitutionalLead } from "@/features/api-public/server/create-institutional-lead";
import {
  createRateLimitResponse,
  addRateLimitHeaders,
} from "@/infrastructure/rate-limiting/api-key-middleware";
import { applyRateLimit } from "@/features/api-public/with-rate-limit";
import { ContextResolutionError } from "@/infrastructure/tenant/context-middleware";
import { logger } from "@/shared/utils/logger";

// ---------------------------------------------------------------------------
// POST /api/v1/leads/institutional
//
// Crea un lead institucional con consentimiento RGPD obligatorio.
// El lead se persiste con source='institutional' en una transacción atómica
// que incluye el consent_record y el encolado del email de notificación.
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

    // 3. Parse and validate request body
    const body = await request.json();

    // 4. Get IP and user-agent for consent record
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    // 5. Create lead + consent + enqueue email atomically
    const result = await createInstitutionalLead({
      ctx,
      payload: body,
      ip,
      userAgent,
    });

    return addRateLimitHeaders(Response.json(result, { status: 201 }), rateCheck.result);
  } catch (error) {
    if (error instanceof ContextResolutionError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    // Validation errors (422)
    if (
      error instanceof Error &&
      "statusCode" in error &&
      (error as Error & { statusCode: number }).statusCode === 422
    ) {
      const typedError = error as Error & {
        details: Record<string, string[] | undefined>;
        statusCode: number;
      };
      return Response.json(
        {
          error: "Validation failed",
          details: typedError.details,
        },
        { status: 422 },
      );
    }

    if (error instanceof SyntaxError) {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    logger.error(
      "Error in POST /api/v1/leads/institutional:",
      error instanceof Error ? error.message : String(error),
    );

    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = handler;
