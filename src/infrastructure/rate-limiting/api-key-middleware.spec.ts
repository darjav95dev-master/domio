import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimiter } from "./rate-limiter.factory";
import type { RateLimiter } from "./rate-limiter.types";
import { DEFAULT_API_LIMIT_PER_MIN } from "@/shared/constants/rate-limits";
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

// ─── Imports under test (after mocks) ────────────────────────────────────────

const TEST_API_KEY_ID = "api-key-001";
const TEST_RATE_LIMIT = 5;
const DEFAULT_LIMIT = DEFAULT_API_LIMIT_PER_MIN;

describe("API Key rate limiting middleware", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RATE_LIMIT_STORE_URL", "https://test.upstash.io");
    mockRedis.get.mockReset().mockResolvedValue(0);
    mockRedis.incr.mockReset().mockResolvedValue(1);
    mockRedis.expire.mockReset().mockResolvedValue(1);
  });

  // ── checkApiKeyRateLimit ────────────────────────────────────────────────

  describe("checkApiKeyRateLimit", () => {
    it("should call rateLimiter.consume with the specified rate limit", async () => {
      const { checkApiKeyRateLimit } = await import("./api-key-middleware");
      rateLimiter = createRateLimiter();

      const spy = vi.spyOn(rateLimiter, "consume");
      await checkApiKeyRateLimit(rateLimiter, TEST_API_KEY_ID, TEST_RATE_LIMIT);

      expect(spy).toHaveBeenCalledWith(TEST_API_KEY_ID, {
        limit: TEST_RATE_LIMIT,
        windowMs: 60_000,
      });
    });

    it("should use DEFAULT_API_LIMIT_PER_MIN when rateLimitPerMin is null", async () => {
      const { checkApiKeyRateLimit } = await import("./api-key-middleware");
      rateLimiter = createRateLimiter();

      const spy = vi.spyOn(rateLimiter, "consume");
      await checkApiKeyRateLimit(rateLimiter, TEST_API_KEY_ID, null);

      expect(spy).toHaveBeenCalledWith(TEST_API_KEY_ID, {
        limit: DEFAULT_LIMIT,
        windowMs: 60_000,
      });
    });

    it("should return the RateLimitResult from consume", async () => {
      const { checkApiKeyRateLimit } = await import("./api-key-middleware");
      rateLimiter = createRateLimiter();

      const result = await checkApiKeyRateLimit(rateLimiter, TEST_API_KEY_ID, TEST_RATE_LIMIT);

      expect(result).toHaveProperty("allowed", true);
      expect(result).toHaveProperty("remaining");
      expect(result).toHaveProperty("limit", TEST_RATE_LIMIT);
      expect(result).toHaveProperty("resetAt");
    });

    it("should return denied result when over limit", async () => {
      // With atomic consume, incr determines the result
      mockRedis.incr.mockReset().mockResolvedValue(TEST_RATE_LIMIT + 1);

      const { checkApiKeyRateLimit } = await import("./api-key-middleware");
      rateLimiter = createRateLimiter();

      const result = await checkApiKeyRateLimit(rateLimiter, TEST_API_KEY_ID, TEST_RATE_LIMIT);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should allow request (degraded) when Redis throws", async () => {
      // Simulate a full Redis outage: both get and incr fail
      mockRedis.get.mockReset().mockRejectedValue(new Error("Connection refused"));
      mockRedis.incr.mockReset().mockRejectedValue(new Error("Connection refused"));
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

      const { checkApiKeyRateLimit } = await import("./api-key-middleware");
      rateLimiter = createRateLimiter();

      const result = await checkApiKeyRateLimit(rateLimiter, TEST_API_KEY_ID, TEST_RATE_LIMIT);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);

      warnSpy.mockRestore();
    });
  });

  // ── createRateLimitResponse ──────────────────────────────────────────────

  describe("createRateLimitResponse", () => {
    it("should return a 429 response with correct error body", async () => {
      const { createRateLimitResponse } = await import("./api-key-middleware");
      const resetAt = new Date(Date.now() + 12_000);
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        resetAt,
      };

      const response = createRateLimitResponse(result);
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body).toEqual({
        error: "Rate limit exceeded",
        retryAfter: expect.any(Number),
      });
    });

    it("should include Retry-After header with positive seconds", async () => {
      const { createRateLimitResponse } = await import("./api-key-middleware");
      const resetAt = new Date(Date.now() + 12_000);
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        resetAt,
      };

      const response = createRateLimitResponse(result);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
      expect(Number(retryAfter)).toBeLessThanOrEqual(13);
    });

    it("should include X-RateLimit-* headers on 429 response", async () => {
      const { createRateLimitResponse } = await import("./api-key-middleware");
      const resetAt = new Date(Date.now() + 60_000);
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        resetAt,
      };

      const response = createRateLimitResponse(result);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Reset")).toBe(String(Math.floor(resetAt.getTime() / 1_000)));
    });

    it("should return Retry-After of at least 1 second", async () => {
      const { createRateLimitResponse } = await import("./api-key-middleware");
      // Reset in the past (edge case)
      const resetAt = new Date(Date.now() - 1_000);
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        resetAt,
      };

      const response = createRateLimitResponse(result);
      const retryAfter = Number(response.headers.get("Retry-After"));
      expect(retryAfter).toBeGreaterThanOrEqual(1);
    });
  });

  // ── addRateLimitHeaders ─────────────────────────────────────────────────

  describe("addRateLimitHeaders", () => {
    it("should add X-RateLimit-* headers to an existing response", async () => {
      const { addRateLimitHeaders } = await import("./api-key-middleware");
      const originalResponse = Response.json({ data: "ok" }, { status: 200 });
      const result = {
        allowed: true,
        remaining: 4,
        limit: 5,
        resetAt: new Date(Date.now() + 60_000),
      };

      const enriched = addRateLimitHeaders(originalResponse, result);

      expect(enriched.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(enriched.headers.get("X-RateLimit-Remaining")).toBe("4");
      expect(enriched.headers.get("X-RateLimit-Reset")).toBe(
        String(Math.floor(result.resetAt.getTime() / 1_000)),
      );
    });

    it("should preserve original response status and body", async () => {
      const { addRateLimitHeaders } = await import("./api-key-middleware");
      const body = { data: "test", count: 42 };
      const originalResponse = Response.json(body, { status: 200 });
      const result = {
        allowed: true,
        remaining: 3,
        limit: 10,
        resetAt: new Date(Date.now() + 30_000),
      };

      const enriched = addRateLimitHeaders(originalResponse, result);

      expect(enriched.status).toBe(200);
      const enrichedBody = await enriched.json();
      expect(enrichedBody).toEqual(body);
    });

    it("should not remove existing headers from original response", async () => {
      const { addRateLimitHeaders } = await import("./api-key-middleware");
      const originalResponse = new Response("ok", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      const result = {
        allowed: true,
        remaining: 2,
        limit: 5,
        resetAt: new Date(Date.now() + 60_000),
      };

      const enriched = addRateLimitHeaders(originalResponse, result);

      expect(enriched.headers.get("Content-Type")).toBe("application/json");
    });
  });
});
