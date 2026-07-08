import { checkIpRateLimit } from "@/infrastructure/rate-limiting/ip-rate-limit";

/**
 * Result of checking the contact form rate limit.
 */
export interface ContactRateLimitResult {
  /** Whether the submission is allowed. */
  readonly allowed: boolean;
  /** Error message if rate limited (undefined when allowed). */
  readonly error?: string;
  /** Seconds to wait before retrying (undefined when allowed). */
  readonly retryAfter?: number;
}

/**
 * Extracts the client IP address from request headers.
 *
 * Priority:
 * 1. `x-forwarded-for` header (first IP in comma-separated list)
 * 2. `x-real-ip` header
 * 3. Falls back to `"unknown"`
 *
 * @param headers - The request headers.
 */
function extractIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0];
    return firstIp ? firstIp.trim() : forwarded.trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Checks rate limit for a contact form submission based on the client IP.
 *
 * Extracts the IP from request headers and invokes `checkIpRateLimit`
 * with the `"contact"` scope.
 *
 * @param headers - Request headers (from the server action or route handler).
 * @returns A `ContactRateLimitResult` indicating whether the submission is allowed.
 *
 * @example
 * ```typescript
 * // In a server action:
 * import { headers } from "next/headers";
 *
 * export async function submitContactForm(formData: FormData) {
 *   const rateLimit = await checkContactRateLimit(headers());
 *   if (!rateLimit.allowed) {
 *     return { error: rateLimit.error, retryAfter: rateLimit.retryAfter };
 *   }
 *   // ... process form
 * }
 * ```
 *
 * @see Feature F022 — actual contact form integration
 */
export async function checkContactRateLimit(headers: Headers): Promise<ContactRateLimitResult> {
  const ip = extractIpFromHeaders(headers);
  const result = await checkIpRateLimit(ip, "contact");

  if (result.allowed) {
    return { allowed: true };
  }

  const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1_000);

  return {
    allowed: false,
    error: "Has realizado demasiados envios. Intentalo de nuevo mas tarde.",
    retryAfter: Math.max(1, retryAfterSeconds),
  };
}
