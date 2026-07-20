/**
 * Integration test verifying that rate limiting runs AFTER authentication.
 *
 * The original composition `export const GET = withRateLimit(handler)` was
 * broken because `withRateLimit` checks for `x-api-key-id` header and returns
 * 401 if missing. But `validateApiKey` (called inside the handler) is what
 * authenticates and provides the API key ID. The wrapper never let the handler
 * run, resulting in 401 on every request.
 *
 * This test verifies the fix: auth runs first, then rate limiting.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const API_KEY_ID = "key-001";
const ENDPOINT_URL = "https://wedomio.com/api/v1/leads/institutional";
const TEST_EMAIL = "test@example.com";
const CONSENT = { legalBasis: "RGPD consent", textAccepted: "Acepto" } as const;

// ---------------------------------------------------------------------------
// Mocks — we mock the auth layer so the test focuses on the rate-limit order
// ---------------------------------------------------------------------------

// Mock validateApiKey to return a valid context immediately (simulates a valid key)
const mockValidateApiKey = vi.hoisted(() => vi.fn());

vi.mock("@/features/api-public/middleware/api-key-auth", () => ({
  validateApiKey: mockValidateApiKey,
}));

// Mock the rate limiter factory so the test doesn't need Redis
const mockConsume = vi.hoisted(() => vi.fn());
const mockRateLimiter = vi.hoisted(
  () =>
    ({
      consume: mockConsume,
      check: vi.fn(),
      increment: vi.fn(),
    }) as const,
);

vi.mock("@/infrastructure/rate-limiting/rate-limiter.factory", () => ({
  createRateLimiter: vi.fn(() => mockRateLimiter),
}));

// We do NOT mock withRateLimit — the bug was caused by mocking it as no-op.

// Mock createInstitutionalLead to avoid noisy stderr from unmocked business logic
const mockCreateInstitutionalLead = vi.hoisted(() => vi.fn());

vi.mock("@/features/api-public/server/create-institutional-lead", () => ({
  createInstitutionalLead: mockCreateInstitutionalLead,
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------

import { POST } from "@app/api/v1/leads/institutional/route";

describe("POST /api/v1/leads/institutional — auth before rate-limit ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // By default, rate limiter allows the request
    mockConsume.mockResolvedValue({
      allowed: true,
      remaining: 59,
      limit: 60,
      resetAt: new Date(Date.now() + 60_000),
    });

    // Mock createInstitutionalLead to succeed by default
    mockCreateInstitutionalLead.mockResolvedValue({
      leadId: "00000000-0000-4000-8000-000000000050",
      consentId: "00000000-0000-4000-8000-000000000060",
      emailQueueId: "email-789",
    });
  });

  it("returns 200-201 when auth succeeds and rate limit allows (no false 401)", async () => {
    // Simulate valid API key auth
    mockValidateApiKey.mockResolvedValue({
      type: "apikey",
      apiKeyId: API_KEY_ID,
      rateLimitPerMin: 60,
      getTenantId: () => TENANT_ID,
      withTransaction: vi.fn(),
    });

    const request = new Request(ENDPOINT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "valid-test-key",
      },
      body: JSON.stringify({
        name: "Test User",
        email: TEST_EMAIL,
        phone: "+34600123456",
        message: "Quiero información",
        promocionId: "00000000-0000-4000-8000-000000000040",
        consent: {
          legalBasis: "RGPD consent",
          textAccepted: "Acepto la política de privacidad",
        },
      }),
    });

    const response = await POST(request);

    // If the bug exists, this will be 401 because withRateLimit rejects before handler.
    // If the fix is correct, this will be 201 (business logic succeeds).
    expect(response.status).toBe(201);

    // The rate limiter should have been called with the API key ID
    expect(mockConsume).toHaveBeenCalledWith(
      API_KEY_ID,
      expect.objectContaining({ limit: 60 }),
    );
  });

  it("returns 401 when auth fails (even before rate limiting)", async () => {
    // Simulate auth failure
    const { ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );
    mockValidateApiKey.mockRejectedValue(
      new ContextResolutionError("Missing API key", 401),
    );

    const request = new Request(ENDPOINT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: TEST_EMAIL,
        consent: CONSENT,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    // La guarda por IP (previa a auth) sí puede consumir, pero el limiter POR
    // CLAVE no debe consumirse cuando auth falla, y el fallo de auth sigue
    // devolviendo 401 (no queda enmascarado como 429).
    expect(mockConsume).not.toHaveBeenCalledWith(
      API_KEY_ID,
      expect.anything(),
    );
  });

  it("does not consume the IP guard's budget as a 401 (auth failure is not masked as 429)", async () => {
    const { ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );
    mockValidateApiKey.mockRejectedValue(
      new ContextResolutionError("Invalid or revoked API key", 403),
    );

    const request = new Request(ENDPOINT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "bad-key" },
      body: JSON.stringify({
        name: "Test User",
        email: TEST_EMAIL,
        consent: CONSENT,
      }),
    });

    const response = await POST(request);
    // El IP guard permite (mock allowed:true), así que gana el error de auth real.
    expect(response.status).toBe(403);
  });

  it("returns 429 from the IP guard BEFORE authenticating (M2)", async () => {
    // El IP guard corre primero y deniega
    mockConsume.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 120,
      resetAt: new Date(Date.now() + 60_000),
    });

    const request = new Request(ENDPOINT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "any" },
      body: "{}",
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    // No se debe intentar autenticar si la IP está limitada
    expect(mockValidateApiKey).not.toHaveBeenCalled();
  });
});
