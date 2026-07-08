import { Redis } from "@upstash/redis";
import type { RateLimitConfig, RateLimitResult, RateLimiter } from "./rate-limiter.types";
import { logger } from "@/shared/utils/logger";

/**
 * Upstash Redis-backed rate limiter with sliding window counter algorithm.
 *
 * The sliding window uses 2 sub-windows (current and previous) and
 * weights the previous window by its overlap with the actual window.
 * This gives O(1) memory per key with good accuracy.
 *
 * `consume()` uses INCR as the atomic primitive (no TOCTOU race).
 * `check()` is a read-only estimation for informational use.
 */
export class UpstashRateLimiter implements RateLimiter {
  constructor(private readonly redis: Redis) {}

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const { currentWindowStart, previousWindowStart, previousWeight } =
        this.calculateWindows(now, config.windowMs);

      const currentKey = this.buildKey(identifier, currentWindowStart);
      const previousKey = this.buildKey(identifier, previousWindowStart);

      const [currentCount, previousCount] = await Promise.all([
        this.redis.get<number>(currentKey).then((v) => v ?? 0),
        this.redis.get<number>(previousKey).then((v) => v ?? 0),
      ]);

      const estimatedCount = currentCount + previousCount * previousWeight;

      const remaining = Math.max(0, config.limit - Math.ceil(estimatedCount));
      const resetAt = new Date(currentWindowStart + config.windowMs);

      return {
        allowed: estimatedCount < config.limit,
        remaining,
        limit: config.limit,
        resetAt,
      };
    } catch (error) {
      logger.warn(
        `Degraded check for "${identifier}":`,
        error instanceof Error ? error.message : String(error),
      );
      return this.degradedResult(config);
    }
  }

  async increment(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const { currentWindowStart } = this.calculateWindows(now, config.windowMs);
      const key = this.buildKey(identifier, currentWindowStart);

      const newCount = await this.redis.incr(key);
      // TTL: 2x the window so the previous window data persists
      await this.redis.expire(key, Math.ceil((config.windowMs * 2) / 1_000));

      const remaining = Math.max(0, config.limit - newCount);
      const resetAt = new Date(currentWindowStart + config.windowMs);

      return {
        allowed: newCount <= config.limit,
        remaining,
        limit: config.limit,
        resetAt,
      };
    } catch (error) {
      logger.warn(
        `Degraded increment for "${identifier}":`,
        error instanceof Error ? error.message : String(error),
      );
      return this.degradedResult(config);
    }
  }

  /**
   * Consume de forma atómica usando INCR como primitiva.
   * Incrementa el contador primero, luego decide si está permitido
   * comparando newCount contra el límite. Esto elimina el TOCTOU
   * entre check() e increment() porque INCR es atómico en Redis.
   */
  async consume(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.increment(identifier, config);
  }

  // ─── Private helpers ──────────────────────────────────────────────────

  private calculateWindows(
    now: number,
    windowMs: number,
  ): { currentWindowStart: number; previousWindowStart: number; previousWeight: number } {
    const currentWindowStart = Math.floor(now / windowMs) * windowMs;
    const previousWindowStart = currentWindowStart - windowMs;
    const elapsed = now - currentWindowStart;
    const previousWeight = Math.max(0, (windowMs - elapsed) / windowMs);

    return { currentWindowStart, previousWindowStart, previousWeight };
  }

  private buildKey(identifier: string, windowStart: number): string {
    return `rl:${identifier}:${windowStart}`;
  }

  private degradedResult(config: RateLimitConfig): RateLimitResult {
    return {
      allowed: true,
      remaining: Infinity,
      limit: config.limit,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }
}
