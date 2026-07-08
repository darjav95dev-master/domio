/**
 * API Key rate limiting middleware.
 *
 * @see specs/008-rate-limiting-and-observability/spec.md RF-1
 * @see specs/008-rate-limiting-and-observability/contracts/rate-limiting-and-observability.md C-4
 */
import type { RateLimitConfig, RateLimitResult, RateLimiter } from "./rate-limiter.types";
import { DEFAULT_API_LIMIT_PER_MIN } from "@/shared/constants/rate-limits";

const API_WINDOW_MS = 60_000; // 1 minute sliding window

/**
 * Checks whether an API key has exceeded its rate limit by consuming one
 * request unit from the rate limiter.
 *
 * Uses `rateLimitPerMin` if provided, otherwise falls back to
 * `DEFAULT_API_LIMIT_PER_MIN`.
 *
 * @param rateLimiter - The rate limiter instance (Upstash or no-op).
 * @param apiKeyId    - The API key identifier used as the rate limit key.
 * @param rateLimitPerMin - Per-key limit; null uses the default.
 * @returns The result from the rate limiter after consuming one unit.
 */
export async function checkApiKeyRateLimit(
  rateLimiter: RateLimiter,
  apiKeyId: string,
  rateLimitPerMin: number | null,
): Promise<RateLimitResult> {
  const limit = rateLimitPerMin ?? DEFAULT_API_LIMIT_PER_MIN;
  const config: RateLimitConfig = { limit, windowMs: API_WINDOW_MS };
  return rateLimiter.consume(apiKeyId, config);
}

/**
 * Creates an HTTP 429 Too Many Requests response with `Retry-After` header
 * and `X-RateLimit-*` headers, plus a JSON body with `error` and `retryAfter`.
 *
 * @param result - The rate limit result that triggered the denial.
 * @returns A Response object with status 429.
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1_000));

  const headers: Record<string, string> = {
    "Retry-After": String(retryAfter),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(0),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1_000)),
  };

  return Response.json(
    { error: "Rate limit exceeded", retryAfter },
    { status: 429, headers },
  );
}

/**
 * Adds `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`
 * headers to an existing Response.
 *
 * Creates a new Response instance preserving the original status, body and
 * existing headers.
 *
 * @param response - The original HTTP response.
 * @param result   - The rate limit result containing counters.
 * @returns A new Response with rate limit headers appended.
 */
export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-RateLimit-Limit", String(result.limit));
  newHeaders.set("X-RateLimit-Remaining", String(result.remaining));
  newHeaders.set("X-RateLimit-Reset", String(Math.floor(result.resetAt.getTime() / 1_000)));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
