/**
 * Extracts the client IP address from request headers.
 *
 * Priority:
 * 1. `x-forwarded-for` header (last IP in comma-separated list)
 * 2. `x-real-ip` header
 * 3. Falls back to `"unknown"`
 *
 * Uses the last IP in x-forwarded-for because behind Vercel/Cloudflare the
 * reverse proxy appends the real client IP at the end. Taking the first IP
 * allows spoofing by setting an arbitrary X-Forwarded-For request header.
 *
 * @param headers - The request headers.
 */
export function extractIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    // ponytail: last entry is the real client IP behind Vercel/Cloudflare proxy
    return ips[ips.length - 1] ?? "unknown";
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}
