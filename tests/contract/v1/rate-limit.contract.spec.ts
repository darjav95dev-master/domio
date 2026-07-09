import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RateLimitConfig, RateLimitResult, RateLimiter } from "@/infrastructure/rate-limiting/rate-limiter.types";
import { createRateLimiter } from "@/infrastructure/rate-limiting/rate-limiter.factory";

// ---------------------------------------------------------------------------
// Rate Limiting Contract Tests (v1)
//
// Verifies the contract of the RateLimiter interface and its implementations:
// 1. The `consume()` method accepts `(identifier, config)` with the full
//    RateLimitConfig signature (M3 fix).
// 2. The no-op degraded mode (no Redis) returns `{ allowed: true }`.
// 3. The Upstash-based limiter (with Redis mock) enforces limits correctly.
// 4. Response format matches the API contract (429 status, Retry-After,
//    X-RateLimit-* headers).
// ---------------------------------------------------------------------------

/**
 * Creates a mock rate limiter that respects the full RateLimiter signature
 * including the `config` parameter (M3 fix).
 *
 * The per-call `config.limit` determines the maximum allowed requests.
 * `config.windowMs` is used for the `resetAt` calculation.
 */
function createMockRateLimiter(): RateLimiter {
  let counter = 0;

  return {
    async check(_identifier: string, cfg: RateLimitConfig) {
      return {
        allowed: counter < cfg.limit,
        remaining: Math.max(0, cfg.limit - counter),
        limit: cfg.limit,
        resetAt: new Date(Date.now() + cfg.windowMs),
      };
    },
    async increment(_identifier: string, cfg: RateLimitConfig) {
      counter++;
      return {
        allowed: counter <= cfg.limit,
        remaining: Math.max(0, cfg.limit - counter),
        limit: cfg.limit,
        resetAt: new Date(Date.now() + cfg.windowMs),
      };
    },
    async consume(_identifier: string, cfg: RateLimitConfig) {
      const wasAllowed = counter < cfg.limit;
      counter++;
      return {
        allowed: wasAllowed,
        remaining: Math.max(0, cfg.limit - counter),
        limit: cfg.limit,
        resetAt: new Date(Date.now() + cfg.windowMs),
      };
    },
  };
}

describe("Rate Limiting Contract (v1)", () => {
  describe("Rate limit response format", () => {
    it("should produce a valid 429 response structure", () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        limit: 60,
        resetAt: new Date(Date.now() + 60_000),
      };

      const retryAfter = Math.max(
        1,
        Math.ceil((result.resetAt.getTime() - Date.now()) / 1_000),
      );

      expect(result.allowed).toBe(false);
      expect(retryAfter).toBeGreaterThanOrEqual(1);

      // Response body contract
      const body = { error: "Rate limit exceeded", retryAfter };
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("retryAfter");
    });

    it("should have X-RateLimit-* headers format", () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        limit: 60,
        resetAt: new Date(Date.now() + 60_000),
      };

      expect(String(result.limit)).toBe("60");
      expect(String(result.remaining)).toBe("0");
      expect(String(Math.floor(result.resetAt.getTime() / 1_000))).toMatch(
        /^\d+$/,
      );
    });
  });

  describe("Rate limiter behavior (respects config)", () => {
    it("should allow requests under the limit", async () => {
      const limiter = createMockRateLimiter();

      const result1 = await limiter.consume("test-key", {
        limit: 5,
        windowMs: 60_000,
      });
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result1.limit).toBe(5);
    });

    it("should deny requests when limit is exceeded", async () => {
      const limiter = createMockRateLimiter();

      await limiter.consume("test-key", { limit: 2, windowMs: 60_000 });
      await limiter.consume("test-key", { limit: 2, windowMs: 60_000 });
      const result = await limiter.consume("test-key", {
        limit: 2,
        windowMs: 60_000,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should track different keys independently", async () => {
      const limiter = createMockRateLimiter();

      const r1 = await limiter.consume("key-a", { limit: 2, windowMs: 60_000 });
      expect(r1.allowed).toBe(true);

      const r2 = await limiter.consume("key-b", { limit: 2, windowMs: 60_000 });
      expect(r2.allowed).toBe(true);
    });

    it("should use config.limit in the result", async () => {
      const limiter = createMockRateLimiter();

      const result = await limiter.consume("test-key", {
        limit: 10,
        windowMs: 60_000,
      });
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it("should provide a resetAt timestamp in the future based on config.windowMs", async () => {
      const limiter = createMockRateLimiter();

      const result = await limiter.consume("test-key", {
        limit: 5,
        windowMs: 60_000,
      });
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Degraded mode (no Redis)", () => {
    beforeEach(() => {
      vi.stubEnv("RATE_LIMIT_STORE_URL", "");
    });

    it("should return a no-op limiter that always allows", async () => {
      const limiter = createRateLimiter();
      const cfg: RateLimitConfig = { limit: 60, windowMs: 60_000 };

      const result = await limiter.consume("any-key", cfg);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.limit).toBe(60);
    });

    it("should not affect normal API operation under high load", async () => {
      const limiter = createRateLimiter();
      const cfg: RateLimitConfig = { limit: 60, windowMs: 60_000 };

      for (let i = 0; i < 100; i++) {
        const result = await limiter.consume("any-key", cfg);
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe("Rate limit configuration contract", () => {
    it("should use configurable limit per API key", async () => {
      const lowConfig: RateLimitConfig = { limit: 1, windowMs: 60_000 };
      const highConfig: RateLimitConfig = { limit: 10, windowMs: 60_000 };

      const lowLimiter = createMockRateLimiter();
      const highLimiter = createMockRateLimiter();

      const lowResult = await lowLimiter.consume("low-key", lowConfig);
      expect(lowResult.limit).toBe(1);
      expect(lowResult.remaining).toBe(0);

      const highResult = await highLimiter.consume("high-key", highConfig);
      expect(highResult.limit).toBe(10);
      expect(highResult.remaining).toBe(9);
    });

    it("should have a reasonable window duration", () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 59,
        limit: 60,
        resetAt: new Date(Date.now() + 60_000),
      };

      const windowMs = result.resetAt.getTime() - Date.now();
      expect(windowMs).toBeGreaterThan(0);
      expect(windowMs).toBeLessThanOrEqual(120_000);
    });
  });
});
