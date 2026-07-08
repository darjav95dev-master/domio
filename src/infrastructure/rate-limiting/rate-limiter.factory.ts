import { Redis } from "@upstash/redis";
import type { RateLimitConfig, RateLimitResult, RateLimiter } from "./rate-limiter.types";
import { UpstashRateLimiter } from "./rate-limiter";

/**
 * Extracts the Upstash REST URL and token from environment variables.
 *
 * `RATE_LIMIT_STORE_URL` can be a full Upstash REST URL (with embedded credentials
 * like `https://key:token@region.upstash.io`) or a plain endpoint URL.
 * If the URL contains embedded credentials, the token is extracted from it.
 * Otherwise, `RATE_LIMIT_STORE_TOKEN` is used as the bearer token.
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
 * No-op rate limiter returned when the rate limit store URL is not configured.
 * Always allows all requests.
 */
class NoopRateLimiter implements RateLimiter {
  private alwaysAllow(config: RateLimitConfig): RateLimitResult {
    return {
      allowed: true,
      remaining: Infinity,
      limit: config.limit,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }

  async check(_identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.alwaysAllow(config);
  }

  async increment(_identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.alwaysAllow(config);
  }

  async consume(_identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.alwaysAllow(config);
  }
}

/**
 * Creates a RateLimiter instance.
 *
 * If `RATE_LIMIT_STORE_URL` is not defined, returns a no-op limiter that
 * always allows requests (safe for development without Upstash).
 *
 * If the store URL is defined, returns an Upstash-backed rate limiter
 * with sliding window counter algorithm.
 */
export function createRateLimiter(): RateLimiter {
  const rawUrl = process.env.RATE_LIMIT_STORE_URL;

  if (!rawUrl) {
    return new NoopRateLimiter();
  }

  const { url, token } = getUpstashCredentials();
  const redis = new Redis({ url, token });
  return new UpstashRateLimiter(redis);
}
