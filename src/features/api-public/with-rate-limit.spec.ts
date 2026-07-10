import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RateLimiter, RateLimitResult } from "@/infrastructure/rate-limiting/rate-limiter.types";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockConsume = vi.fn<RateLimiter["consume"]>();
const mockRateLimiter: RateLimiter = {
  check: vi.fn(),
  increment: vi.fn(),
  consume: mockConsume,
};

vi.mock("@/infrastructure/rate-limiting/rate-limiter.factory", () => ({
  createRateLimiter: () => mockRateLimiter,
}));

// Mock api-key-middleware
const mockCheckApiKeyRateLimit = vi.fn();

vi.mock("@/infrastructure/rate-limiting/api-key-middleware", () => ({
  checkApiKeyRateLimit: mockCheckApiKeyRateLimit,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("applyRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return allowed=true when rate limit is not exceeded", async () => {
    const { applyRateLimit } = await import("./with-rate-limit");
    const allowedResult: RateLimitResult = {
      allowed: true,
      remaining: 59,
      limit: 60,
      resetAt: new Date(Date.now() + 60_000),
    };
    mockCheckApiKeyRateLimit.mockResolvedValue(allowedResult);

    const result = await applyRateLimit("key-001", 60);

    expect(result.allowed).toBe(true);
    expect(result.result).toBe(allowedResult);
    expect(mockCheckApiKeyRateLimit).toHaveBeenCalledWith(
      mockRateLimiter,
      "key-001",
      60,
    );
  });

  it("should return allowed=false when rate limit is exceeded", async () => {
    const { applyRateLimit } = await import("./with-rate-limit");
    const deniedResult: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 5,
      resetAt: new Date(Date.now() + 10_000),
    };
    mockCheckApiKeyRateLimit.mockResolvedValue(deniedResult);

    const result = await applyRateLimit("key-001", 5);

    expect(result.allowed).toBe(false);
    expect(result.result).toBe(deniedResult);
  });

  it("should pass null rateLimitPerMin when not provided (uses default)", async () => {
    const { applyRateLimit } = await import("./with-rate-limit");
    const allowedResult: RateLimitResult = {
      allowed: true,
      remaining: 59,
      limit: 60,
      resetAt: new Date(Date.now() + 60_000),
    };
    mockCheckApiKeyRateLimit.mockResolvedValue(allowedResult);

    await applyRateLimit("key-001");

    expect(mockCheckApiKeyRateLimit).toHaveBeenCalledWith(
      mockRateLimiter,
      "key-001",
      null,
    );
  });

  it("does NOT require x-api-key-id header (unlike withRateLimit)", async () => {
    // This test verifies that applyRateLimit works without any request headers
    // — it takes the apiKeyId as a parameter directly from the auth context.
    const { applyRateLimit } = await import("./with-rate-limit");
    const allowedResult: RateLimitResult = {
      allowed: true,
      remaining: 59,
      limit: 60,
      resetAt: new Date(Date.now() + 60_000),
    };
    mockCheckApiKeyRateLimit.mockResolvedValue(allowedResult);

    // No headers needed — apiKeyId comes from auth context, not from request
    const result = await applyRateLimit("key-002");

    expect(result.allowed).toBe(true);
  });
});


