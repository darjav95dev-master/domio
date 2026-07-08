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

// Fully mock api-key-middleware to test composition in isolation
const mockCheckApiKeyRateLimit = vi.fn();
const mockCreateRateLimitResponse = vi.fn();
const mockAddRateLimitHeaders = vi.fn();

vi.mock("@/infrastructure/rate-limiting/api-key-middleware", () => ({
  checkApiKeyRateLimit: mockCheckApiKeyRateLimit,
  createRateLimitResponse: mockCreateRateLimitResponse,
  addRateLimitHeaders: mockAddRateLimitHeaders,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockRequest(headers: Record<string, string>): Request {
  return new Request("https://api.example.com/v1/promociones", { headers });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("withRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when x-api-key-id header is missing", async () => {
    const { withRateLimit } = await import("./with-rate-limit");
    const handler = vi.fn();

    const wrapped = withRateLimit(handler);
    const request = createMockRequest({});
    const response = await wrapped(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error", "Unauthorized");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should return 429 when rate limit is exceeded", async () => {
    const { withRateLimit } = await import("./with-rate-limit");
    const handler = vi.fn();
    const deniedResult: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 5,
      resetAt: new Date(Date.now() + 10_000),
    };
    mockCheckApiKeyRateLimit.mockResolvedValue(deniedResult);

    const rateLimitResponse = new Response(
      JSON.stringify({ error: "Rate limit exceeded", retryAfter: 10 }),
      { status: 429, headers: { "Retry-After": "10" } },
    );
    mockCreateRateLimitResponse.mockReturnValue(rateLimitResponse);

    const wrapped = withRateLimit(handler);
    const request = createMockRequest({
      "x-api-key-id": "key-001",
      "x-rate-limit-per-min": "5",
    });
    const response = await wrapped(request);

    expect(response.status).toBe(429);
    expect(mockCheckApiKeyRateLimit).toHaveBeenCalledWith(
      mockRateLimiter,
      "key-001",
      5,
    );
    expect(mockCreateRateLimitResponse).toHaveBeenCalledWith(deniedResult);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should use default rate limit when x-rate-limit-per-min is not set", async () => {
    const { withRateLimit } = await import("./with-rate-limit");
    const handler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const allowedResult: RateLimitResult = {
      allowed: true,
      remaining: 59,
      limit: 60,
      resetAt: new Date(Date.now() + 60_000),
    };
    mockCheckApiKeyRateLimit.mockResolvedValue(allowedResult);
    mockAddRateLimitHeaders.mockImplementation(
      (response: Response) => response,
    );

    const wrapped = withRateLimit(handler);
    const request = createMockRequest({ "x-api-key-id": "key-001" });
    await wrapped(request);

    expect(mockCheckApiKeyRateLimit).toHaveBeenCalledWith(
      mockRateLimiter,
      "key-001",
      null,
    );
  });

  it("should call the inner handler and add headers when rate limit allows", async () => {
    const { withRateLimit } = await import("./with-rate-limit");
    const innerResponse = new Response(JSON.stringify({ data: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const handler = vi.fn().mockResolvedValue(innerResponse);

    const allowedResult: RateLimitResult = {
      allowed: true,
      remaining: 4,
      limit: 5,
      resetAt: new Date(Date.now() + 60_000),
    };
    mockCheckApiKeyRateLimit.mockResolvedValue(allowedResult);

    const enrichedResponse = new Response(innerResponse.body, {
      status: 200,
      headers: { "Content-Type": "application/json", "X-RateLimit-Limit": "5" },
    });
    mockAddRateLimitHeaders.mockReturnValue(enrichedResponse);

    const wrapped = withRateLimit(handler);
    const request = createMockRequest({
      "x-api-key-id": "key-001",
      "x-rate-limit-per-min": "5",
    });
    const response = await wrapped(request);

    expect(handler).toHaveBeenCalledWith(request, undefined);
    expect(mockAddRateLimitHeaders).toHaveBeenCalledWith(
      innerResponse,
      allowedResult,
    );
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
  });
});
