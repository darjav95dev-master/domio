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
export function extractIpFromHeaders(headers: Headers): string {
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
