import { Redis } from "@upstash/redis";

let _redisClient: Redis | null = null;

/**
 * Extrae credenciales Upstash de env vars.
 */
function getUpstashCredentials(): { url: string; token: string } {
  const rawUrl = process.env.RATE_LIMIT_STORE_URL ?? "";

  const embeddedToken = process.env.RATE_LIMIT_STORE_TOKEN;
  if (embeddedToken) {
    return { url: rawUrl, token: embeddedToken };
  }

  // Try to extract token from embedded credentials in the URL
  try {
    const parsed = new URL(rawUrl);
    const pw = parsed.password || parsed.username;
    if (pw) {
      const cleanUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`;
      return { url: cleanUrl, token: pw };
    }
  } catch {
    // ignore parse errors
  }

  return { url: rawUrl, token: "" };
}

/**
 * Returns a singleton Upstash Redis client.
 *
 * If `RATE_LIMIT_STORE_URL` is not defined, returns `null` (no-op mode).
 * Credentials can come from `RATE_LIMIT_STORE_TOKEN` or be embedded in the URL.
 */
export function getRedisClient(): Redis | null {
  if (_redisClient) return _redisClient;

  const rawUrl = process.env.RATE_LIMIT_STORE_URL;
  if (!rawUrl) return null;

  const { url, token } = getUpstashCredentials();
  _redisClient = new Redis({ url, token });
  return _redisClient;
}
