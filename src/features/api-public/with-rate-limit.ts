import { createRateLimiter } from "@/infrastructure/rate-limiting/rate-limiter.factory";
import { checkApiKeyRateLimit } from "@/infrastructure/rate-limiting/api-key-middleware";
import type { RateLimitResult } from "@/infrastructure/rate-limiting/rate-limiter.types";

/**
 * Apply rate limiting for an API key after authentication has resolved.
 *
 * Unlike `withRateLimit` (removed — dead code), this function does NOT
 * expect `x-api-key-id` in request headers. Instead, it takes the `apiKeyId`
 * directly from the authenticated context, ensuring auth runs before rate
 * limiting.
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
