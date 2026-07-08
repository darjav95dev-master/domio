import { checkIpRateLimit, type IpRateLimitResult } from "@/infrastructure/rate-limiting/ip-rate-limit";
import { extractIpFromHeaders } from "@/shared/utils/extract-ip";

/**
 * Checks rate limit for a login attempt based on the client IP.
 *
 * Extracts the IP from request headers and invokes `checkIpRateLimit`
 * with the `"login"` scope.
 *
 * @param headers - Request headers (typically from `request.headers` in Auth.js callback).
 * @returns `null` if the request is allowed, or a `Response` with status 429 if rate limited.
 *
 * @example
 * ```typescript
 * // In Auth.js credentials authorize callback:
 * const rateLimitResponse = await checkLoginRateLimit(request.headers);
 * if (rateLimitResponse) return rateLimitResponse; // 429
 * ```
 *
 * @see Feature F005 — actual Auth.js v5 integration
 */
export async function checkLoginRateLimit(headers: Headers): Promise<Response | null> {
  const ip = extractIpFromHeaders(headers);
  const result: IpRateLimitResult = await checkIpRateLimit(ip, "login");

  if (result.allowed) {
    return null;
  }

  const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1_000);

  return new Response(
    JSON.stringify({
      error: "Demasiados intentos de inicio de sesion. Intentalo de nuevo mas tarde.",
      retryAfter: Math.max(1, retryAfterSeconds),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
      },
    },
  );
}
