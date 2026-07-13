// @vitest-environment node
/**
 * Integration test for the login rate limiting middleware.
 *
 * Verifies that:
 * 1. POST /api/auth/callback/credentials triggers rate limit check
 * 2. A 429 response is returned when rate limited, with Retry-After header
 * 3. Non-POST methods to the login endpoint don't trigger rate limiting
 * 4. Other paths don't trigger login rate limiting
 *
 * @see middleware.ts
 * @see src/infrastructure/auth/rate-limit-login.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock checkLoginRateLimit before importing the middleware
// ---------------------------------------------------------------------------
const mockCheckLoginRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/infrastructure/auth/rate-limit-login", () => ({
  checkLoginRateLimit: mockCheckLoginRateLimit,
}));

// Mock getToken from next-auth/jwt — needed for auth guard in middleware
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn().mockResolvedValue({ sub: "user-1" }),
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------
import { middleware } from "../../middleware";

const CREDENTIALS_URL = "https://wedomio.com/api/auth/callback/credentials";

describe("login rate limiting in middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls checkLoginRateLimit on POST /api/auth/callback/credentials", async () => {
    mockCheckLoginRateLimit.mockResolvedValue(null);

    const request = new NextRequest(
      new Request(CREDENTIALS_URL, {
        method: "POST",
      }),
    );

    const response = await middleware(request);

    expect(mockCheckLoginRateLimit).toHaveBeenCalledTimes(1);
    expect(response.status).not.toBe(429);
  });

  it("returns 429 with Retry-After header when rate limited", async () => {
    const rateLimitResponse = new Response(
      JSON.stringify({ error: "Demasiados intentos", retryAfter: 60 }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
    mockCheckLoginRateLimit.mockResolvedValue(rateLimitResponse);

    const request = new NextRequest(
      new Request(CREDENTIALS_URL, {
        method: "POST",
      }),
    );

    const response = await middleware(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("retryAfter");
  });

  it("does NOT check rate limit on GET requests to login endpoint", async () => {
    const request = new NextRequest(
      new Request(CREDENTIALS_URL, {
        method: "GET",
      }),
    );

    await middleware(request);

    expect(mockCheckLoginRateLimit).not.toHaveBeenCalled();
  });

  it("does NOT check rate limit on POST requests to other paths", async () => {
    const request = new NextRequest(
      new Request("https://wedomio.com/api/auth/callback/session", {
        method: "POST",
      }),
    );

    await middleware(request);

    expect(mockCheckLoginRateLimit).not.toHaveBeenCalled();
  });

  it("does NOT check rate limit on POST requests to non-auth paths", async () => {
    const request = new NextRequest(
      new Request("https://wedomio.com/api/internal/promociones", {
        method: "POST",
      }),
    );

    await middleware(request);

    expect(mockCheckLoginRateLimit).not.toHaveBeenCalled();
  });

  it("passes through to auth guard for /panel/ paths when not rate limited", async () => {
    mockCheckLoginRateLimit.mockResolvedValue(null);

    const request = new NextRequest(
      new Request("https://wedomio.com/panel/catalogo", {
        method: "GET",
      }),
    );

    await middleware(request);

    // Auth check should have run (getToken was called), no redirect because
    // the mock returns { sub: "user-1" } — user is authenticated
    expect(mockCheckLoginRateLimit).not.toHaveBeenCalled();
  });

  it("simulates full rate-limit-then-allow cycle (5 allowed, 1 blocked)", async () => {
    // First 5 attempts succeed
    mockCheckLoginRateLimit.mockResolvedValue(null);

    for (let i = 0; i < 5; i++) {
      const request = new NextRequest(
        new Request(CREDENTIALS_URL, {
          method: "POST",
        }),
      );
      const response = await middleware(request);
      expect(response.status).not.toBe(429);
    }

    expect(mockCheckLoginRateLimit).toHaveBeenCalledTimes(5);

    // 6th attempt is rate limited
    const rateLimitResponse = new Response(
      JSON.stringify({ error: "Demasiados intentos", retryAfter: 30 }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "30",
        },
      },
    );

    mockCheckLoginRateLimit.mockResolvedValue(rateLimitResponse);

    const request = new NextRequest(
      new Request(CREDENTIALS_URL, {
        method: "POST",
      }),
    );
    const response = await middleware(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(mockCheckLoginRateLimit).toHaveBeenCalledTimes(6);
  });
});
