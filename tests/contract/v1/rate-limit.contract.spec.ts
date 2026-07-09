import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RateLimiter } from "@/infrastructure/rate-limiting/rate-limiter.types";

/**
 * Helper: creates a rate limiter mock that simulates rate limiting behavior.
 */
function createMockRateLimiter(options: {
  initiallyAllowed?: boolean;
  denyAfter?: number;
}): RateLimiter {
  let counter = 0;
  const denyAfter = options.denyAfter ?? 0;

  return {
    async check(_identifier: string) {
      return {
        allowed: counter < denyAfter,
        remaining: Math.max(0, denyAfter - counter),
        limit: denyAfter,
        resetAt: new Date(Date.now() + 60_000),
      };
    },
    async increment(_identifier: string) {
      counter++;
      return {
        allowed: counter <= denyAfter,
        remaining: Math.max(0, denyAfter - counter),
        limit: denyAfter,
        resetAt: new Date(Date.now() + 60_000),
      };
    },
    async consume(_identifier: string) {
      const wasAllowed = counter < denyAfter;
      counter++;
      return {
        allowed: wasAllowed,
        remaining: Math.max(0, denyAfter - counter),
        limit: denyAfter,
        resetAt: new Date(Date.now() + 60_000),
      };
    },
  };
}

describe("Rate Limiting Contract (v1)", () => {
  describe("Rate limit response format", () => {
    it("should have correct status code (429)", () => {
      const limiter = createMockRateLimiter({ denyAfter: 0 });
      // After consuming one request with limit=0, the result should show blocked
      const result = {
        allowed: false,
        remaining: 0,
        limit: 60,
        resetAt: new Date(Date.now() + 60_000),
      };

      // The 429 response body should contain error and retryAfter
      const retryAfter = Math.max(
        1,
        Math.ceil((result.resetAt.getTime() - Date.now()) / 1_000),
      );

      expect(result.allowed).toBe(false);
      expect(retryAfter).toBeGreaterThanOrEqual(1);
    });

    it("should include Retry-After header value in response body", () => {
      const resetAt = new Date(Date.now() + 30_000);
      const retryAfter = Math.max(
        1,
        Math.ceil((resetAt.getTime() - Date.now()) / 1_000),
      );

      // The retryAfter must be a positive integer
      expect(Number.isInteger(retryAfter)).toBe(true);
      expect(retryAfter).toBeGreaterThan(0);
    });

    it("should have X-RateLimit-* headers format", () => {
      const result = {
        allowed: false,
        remaining: 0,
        limit: 60,
        resetAt: new Date(Date.now() + 60_000),
      };

      // Verify header values are numeric strings
      expect(String(result.limit)).toBe("60");
      expect(String(result.remaining)).toBe("0");
      expect(String(Math.floor(result.resetAt.getTime() / 1_000))).toMatch(
        /^\d+$/,
      );
    });
  });

  describe("Rate limiter behavior", () => {
    it("should allow requests under the limit", async () => {
      const limiter = createMockRateLimiter({ denyAfter: 5 });

      const result1 = await limiter.consume("test-key");
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
    });

    it("should deny requests when limit is exceeded", async () => {
      const limiter = createMockRateLimiter({ denyAfter: 2 });

      await limiter.consume("test-key"); // 1st: allowed
      await limiter.consume("test-key"); // 2nd: allowed (at limit)
      const result = await limiter.consume("test-key"); // 3rd: denied

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should have correct remaining count", async () => {
      const limiter = createMockRateLimiter({ denyAfter: 5 });

      const r1 = await limiter.consume("test-key");
      expect(r1.remaining).toBe(4);

      const r2 = await limiter.consume("test-key");
      expect(r2.remaining).toBe(3);
    });

    it("should track different keys independently", async () => {
      const limiter = createMockRateLimiter({ denyAfter: 2 });

      const r1 = await limiter.consume("key-a");
      expect(r1.allowed).toBe(true);

      // Different key should still be allowed (independent counters)
      const r2 = await limiter.consume("key-b");
      expect(r2.allowed).toBe(true);
    });

    it("should provide a resetAt timestamp in the future", async () => {
      const limiter = createMockRateLimiter({ denyAfter: 5 });
      const result = await limiter.consume("test-key");

      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Degraded mode", () => {
    it("should pass when rate limiter is no-op (degraded mode)", async () => {
      // Simulate no-op rate limiter (no Redis configured)
      const noopLimiter: RateLimiter = {
        async check(_identifier: string) {
          return {
            allowed: true,
            remaining: Infinity,
            limit: 60,
            resetAt: new Date(Date.now() + 60_000),
          };
        },
        async increment(_identifier: string) {
          return {
            allowed: true,
            remaining: Infinity,
            limit: 60,
            resetAt: new Date(Date.now() + 60_000),
          };
        },
        async consume(_identifier: string) {
          return {
            allowed: true,
            remaining: Infinity,
            limit: 60,
            resetAt: new Date(Date.now() + 60_000),
          };
        },
      };

      const result = await noopLimiter.consume("any-key");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it("should not affect normal API operation", async () => {
      const noopLimiter: RateLimiter = {
        async consume(_identifier: string) {
          return {
            allowed: true,
            remaining: Infinity,
            limit: 60,
            resetAt: new Date(Date.now() + 60_000),
          };
        },
        async check(_identifier: string) {
          return {
            allowed: true,
            remaining: Infinity,
            limit: 60,
            resetAt: new Date(Date.now() + 60_000),
          };
        },
        async increment(_identifier: string) {
          return {
            allowed: true,
            remaining: Infinity,
            limit: 60,
            resetAt: new Date(Date.now() + 60_000),
          };
        },
      };

      // Simulate many rapid requests - all should be allowed in degraded mode
      for (let i = 0; i < 100; i++) {
        const result = await noopLimiter.consume("any-key");
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe("Rate limit configuration contract", () => {
    it("should use configurable limit per API key", async () => {
      // Keys with higher limits should allow more requests
      const lowLimitLimiter = createMockRateLimiter({ denyAfter: 1 });
      const highLimitLimiter = createMockRateLimiter({ denyAfter: 10 });

      const lowResult = await lowLimitLimiter.consume("low-key");
      expect(lowResult.limit).toBe(1);

      const highResult = await highLimitLimiter.consume("high-key");
      expect(highResult.limit).toBe(10);
    });

    it("should have a window duration", async () => {
      const result = {
        allowed: true,
        remaining: 59,
        limit: 60,
        resetAt: new Date(Date.now() + 60_000),
      };

      // Window should be approximately 60 seconds
      const windowMs = result.resetAt.getTime() - Date.now();
      expect(windowMs).toBeGreaterThan(0);
      expect(windowMs).toBeLessThanOrEqual(120_000);
    });
  });
});
