import type { RateLimitConfig, RateLimitResult, RateLimiter } from "./rate-limiter.types";
import { UpstashRateLimiter } from "./rate-limiter";
import { getRedisClient } from "./redis-client";

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
  const redis = getRedisClient();

  if (!redis) {
    return new NoopRateLimiter();
  }

  return new UpstashRateLimiter(redis);
}
