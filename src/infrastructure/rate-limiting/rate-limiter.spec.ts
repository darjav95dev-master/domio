import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimiter } from "./rate-limiter.factory";
import type { RateLimitConfig } from "./rate-limiter.types";

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

    it("should deny requests over the limit", async () => {
      mockRedis.get.mockReset().mockResolvedValue(config.limit);
      mockRedis.incr.mockReset().mockResolvedValue(1);
      mockRedis.expire.mockReset().mockResolvedValue(1);

      const limiter = createRateLimiter();
      const result = await limiter.consume("user-2", config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should return correct remaining and resetAt", async () => {
      mockRedis.get.mockReset().mockResolvedValue(1);
      mockRedis.incr.mockReset().mockResolvedValue(2);
      mockRedis.expire.mockReset().mockResolvedValue(1);

      const limiter = createRateLimiter();
      const result = await limiter.consume("user-3", config);

      expect(result.limit).toBe(config.limit);
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should NOT increment when over limit", async () => {
      mockRedis.get.mockReset().mockResolvedValue(config.limit);
      mockRedis.incr.mockReset().mockResolvedValue(1);
      mockRedis.expire.mockReset().mockResolvedValue(1);

      const limiter = createRateLimiter();
      await limiter.consume("user-4", config);

      // incr should not be called because check failed
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    it("should degrade gracefully when Redis throws on check", async () => {
      // When the store is down, all operations fail
      mockRedis.get.mockReset().mockRejectedValue(new Error("Connection refused"));
      mockRedis.incr.mockReset().mockRejectedValue(new Error("Connection refused"));

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const limiter = createRateLimiter();
      const result = await limiter.consume("user-5", config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should degrade gracefully when Redis throws on increment", async () => {
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockRejectedValue(new Error("Timeout"));
      mockRedis.expire.mockReset().mockResolvedValue(1);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const limiter = createRateLimiter();
      const result = await limiter.consume("user-6", config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should calculate sliding window with weighted previous window", async () => {
      // Pin time to a window boundary so that elapsed = 0 and weight = 1.0
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1_000_000_000_000));

      // Simulate: previous window has 4 requests, current has 2
      // With limit 5 and elapsed=0: weight = (1000-0)/1000 = 1.0
      // estimated = 2 + 4 * 1.0 = 6 → denied
      const shortConfig: RateLimitConfig = { limit: 5, windowMs: 1_000 };

      mockRedis.get
        .mockReset()
        .mockResolvedValueOnce(2)   // current window count
        .mockResolvedValueOnce(4);  // previous window count
      mockRedis.incr.mockReset().mockResolvedValue(3);
      mockRedis.expire.mockReset().mockResolvedValue(1);

      const limiter = createRateLimiter();
      const result = await limiter.consume("user-sliding", shortConfig);

      // With limit 5, estimated 6 → denied
      expect(result.allowed).toBe(false);

      vi.useRealTimers();
    });
  });
});
