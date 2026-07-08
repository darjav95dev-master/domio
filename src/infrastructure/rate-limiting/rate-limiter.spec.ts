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

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(() => mockRedis),
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
      vi.stubEnv("RATE_LIMIT_STORE_URL", "");
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
      vi.stubEnv("RATE_LIMIT_STORE_URL", "https://test.upstash.io");
      // Reset each mock to a clean state with sensible defaults
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
      // Pin time to a window boundary so that elapsed = 0 and weight = 1.0
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1_000_000_000_000));

      // Simulate: previous window has 4 requests, current has 2
      // With limit 5 and elapsed=0: weight = (1000-0)/1000 = 1.0
      // estimated = 2 + 4 * 1.0 = 6 → denied
      const shortConfig: RateLimitConfig = { limit: 5, windowMs: 1_000 };

      mockRedis.get
        .mockReset()
        .mockResolvedValueOnce(2) // current window count
        .mockResolvedValueOnce(4); // previous window count

      const limiter = createRateLimiter();
      const result = await limiter.check("user-sliding", shortConfig);

      // With limit 5, estimated 6 → denied
      expect(result.allowed).toBe(false);

      vi.useRealTimers();
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
