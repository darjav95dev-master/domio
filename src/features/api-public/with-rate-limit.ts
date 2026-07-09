/**
 * High-order function that wraps a Next.js Route Handler with API key
 * rate limiting.
 *
 * @see specs/008-rate-limiting-and-observability/spec.md RF-1
 * @see specs/008-rate-limiting-and-observability/contracts/rate-limiting-and-observability.md C-4
 */
import { createRateLimiter } from "@/infrastructure/rate-limiting/rate-limiter.factory";
import {
  checkApiKeyRateLimit,
  createRateLimitResponse,
  addRateLimitHeaders,
} from "@/infrastructure/rate-limiting/api-key-middleware";
import type { RateLimitResult } from "@/infrastructure/rate-limiting/rate-limiter.types";

export type NextHandler = (
  request: Request,
  context?: { params?: Record<string, string | undefined> },
) => Promise<Response> | Response;

/**
 * Apply rate limiting for an API key after authentication has resolved.
 *
 * Unlike `withRateLimit`, this function does NOT expect `x-api-key-id` in
 * request headers. Instead, it takes the `apiKeyId` directly from the
 * authenticated context, ensuring auth runs before rate limiting.
 *
 * @param apiKeyId       - The authenticated API key's ID.
 * @param rateLimitPerMin - Per-key rate limit; defaults to the key's configured
 *                          limit or the global default if omitted.
 * @returns An object indicating whether the request is allowed, plus the
 *          rate limit result for attaching headers to the response.
 */
export async function applyRateLimit(
  apiKeyId: string,
  rateLimitPerMin?: number,
): Promise<{ allowed: boolean; result: RateLimitResult }> {
  const rateLimiter = createRateLimiter();
  const result = await checkApiKeyRateLimit(rateLimiter, apiKeyId, rateLimitPerMin ?? null);
  return { allowed: result.allowed, result };
}

/**
 * Wraps a Next.js Route Handler, applying API key rate limiting before the
 * handler's business logic.
 *
 * Expects the auth middleware to have set `x-api-key-id` and optionally
 * `x-rate-limit-per-min` headers on the incoming request.
 *
 * If `x-api-key-id` is missing, returns 401 Unauthorized.
 * If the rate limit is exceeded, returns 429 Too Many Requests with
 * `Retry-After` and `X-RateLimit-*` headers.
 * If the request is allowed, the response from the inner handler is enriched
 * with `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`.
 *
 * @param handler - The original route handler.
 * @returns A wrapped handler with rate limiting applied.
 */
export function withRateLimit(handler: NextHandler): NextHandler {
  return async (request: Request, context?: { params?: Record<string, string | undefined> }) => {
    const apiKeyId = request.headers.get("x-api-key-id");
    if (!apiKeyId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitPerMinStr = request.headers.get("x-rate-limit-per-min");
    const rateLimitPerMin = rateLimitPerMinStr ? Number(rateLimitPerMinStr) : null;

    const rateLimiter = createRateLimiter();
    const result = await checkApiKeyRateLimit(rateLimiter, apiKeyId, rateLimitPerMin);

    if (!result.allowed) {
      return createRateLimitResponse(result);
    }

    const response = await handler(request, context);
    return addRateLimitHeaders(response, result);
  };
}
