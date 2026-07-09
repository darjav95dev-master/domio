import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimiter } from "./rate-limiter.factory";
import type { RateLimitConfig } from "./rate-limiter.types";
import { logger } from "@/shared/utils/logger";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRedis = {
  get: vi.fn<(key: string) => Promise<number | null>>().mockResolvedValue(0),
  incr: vi.fn<(key: string) => Promise<number>>().mockResolvedValue(1),
  expire: vi.fn<(key: string, ttl: number) => Promise<0 | 1>>().mockResolvedValue(1),
};

// ponytail: mock redis-client directly so the singleton never leaks across test files
const mockGetRedisClient = vi.hoisted(() => vi.fn());
vi.mock("@/infrastructure/rate-limiting/redis-client", () => ({
  getRedisClient: mockGetRedisClient,
}));

// ─── Constants ───────────────────────────────────────────────────────────────

const config: RateLimitConfig = { limit: 3, windowMs: 60_000 };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── No-op rate limiter ─────────────────────────────────────────────────

  describe("no-op (no RATE_LIMIT_STORE_URL)", () => {
    beforeEach(() => {
      mockGetRedisClient.mockReturnValue(null);
    });

    it("should always allow requests", async () => {
      const limiter = createRateLimiter();
      const result = await limiter.consume("test-id", config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.limit).toBe(config.limit);
    });

    it("should return remaining Infinity for check and increment", async () => {
      const limiter = createRateLimiter();
      const checkResult = await limiter.check("test-id", config);
      expect(checkResult.remaining).toBe(Infinity);

      const incrResult = await limiter.increment("test-id", config);
      expect(incrResult.remaining).toBe(Infinity);
    });
  });

  // ── Upstash-backed rate limiter ───────────────────────────────────────

  describe("Upstash rate limiter", () => {
    beforeEach(() => {
      mockGetRedisClient.mockReturnValue(mockRedis);
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockResolvedValue(1);
      mockRedis.expire.mockReset().mockResolvedValue(1);
    });

    it("should allow requests under the limit", async () => {
      const limiter = createRateLimiter();
      const result = await limiter.consume("user-1", config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(2);
    });

    it("should deny requests when counter exceeds the limit", async () => {
      // Simulate counter at limit+1 (atomic consume uses increment directly)
      mockRedis.incr.mockReset().mockResolvedValue(4);

      const limiter = createRateLimiter();
      const result = await limiter.consume("user-over", config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should allow exactly `limit` requests and deny the (limit+1)th", async () => {
      // With atomic consume, each call increments. Simulate sequential INCR results:
      // 1st call → incr returns 1, allowed (1 <= 3)
      // 2nd call → incr returns 2, allowed (2 <= 3)
      // 3rd call → incr returns 3, allowed (3 <= 3)
      // 4th call → incr returns 4, denied  (4 > 3)
      const incrResults = [1, 2, 3, 4];
      mockRedis.incr.mockReset().mockImplementation(() => {
        const val = incrResults.shift() ?? 99;
        return Promise.resolve(val);
      });

      const limiter = createRateLimiter();

      // 3 requests within limit
      for (let i = 0; i < 3; i++) {
        const r = await limiter.consume("user-boundary", config);
        expect(r.allowed).toBe(true);
      }

      // 4th request exceeds the limit
      const denied = await limiter.consume("user-boundary", config);
      expect(denied.allowed).toBe(false);
      expect(denied.remaining).toBe(0);
    });

    it("should return correct remaining and resetAt", async () => {
      mockRedis.incr.mockReset().mockResolvedValue(2);

      const limiter = createRateLimiter();
      const result = await limiter.consume("user-3", config);

      expect(result.limit).toBe(config.limit);
      expect(result.remaining).toBe(1); // 3 - 2 = 1
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should degrade gracefully when Redis throws on increment", async () => {
      mockRedis.incr.mockReset().mockRejectedValue(new Error("Timeout"));

      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

      const limiter = createRateLimiter();
      const result = await limiter.consume("user-6", config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should calculate sliding window estimation in check()", async () => {
      // Use counts that exceed the limit regardless of the previous-window weight:
      // current = 6 alone already > limit 5, so no timer pinning needed.
      const shortConfig: RateLimitConfig = { limit: 5, windowMs: 1_000 };

      mockRedis.get
        .mockReset()
        .mockResolvedValueOnce(6) // current window count (exceeds limit alone)
        .mockResolvedValueOnce(0); // previous window count

      const limiter = createRateLimiter();
      const result = await limiter.check("user-sliding", shortConfig);

      expect(result.allowed).toBe(false);
    });

    it("should return degraded result when check() encounters Redis error", async () => {
      mockRedis.get.mockReset().mockRejectedValue(new Error("Connection refused"));

      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

      const limiter = createRateLimiter();
      const result = await limiter.check("user-check-fail", config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
