import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_URL = "https://wedomio.com/api/v1/leads/institutional";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const TEST_EMAIL = "test@example.com";
const TEST_CONSENT_BASIS = "RGPD consent";

// ---------------------------------------------------------------------------
// Mocks — using vi.hoisted for proper hoisting with vi.mock
// ---------------------------------------------------------------------------
const mockValidateApiKey = vi.hoisted(() => vi.fn());
const mockCreateInstitutionalLead = vi.hoisted(() => vi.fn());
const mockApplyRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/features/api-public/middleware/api-key-auth", () => ({
  validateApiKey: mockValidateApiKey,
}));

// Mock applyRateLimit to allow the request by default (rate limit integration
// is tested separately in api-v1-rate-limit-auth-order.test.ts)
vi.mock("@/features/api-public/with-rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/api-public/with-rate-limit")>();
  return {
    ...actual,
    applyRateLimit: mockApplyRateLimit,
  };
});

vi.mock("@/features/api-public/server/create-institutional-lead", () => ({
  createInstitutionalLead: mockCreateInstitutionalLead,
}));

// We do NOT mock context-middleware so the real ContextResolutionError class
// is available for instanceof checks in the route handler.

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
import { POST } from "@app/api/v1/leads/institutional/route";
import { ContextResolutionError } from "@/infrastructure/tenant/context-middleware";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/v1/leads/institutional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // By default, rate limiter allows the request
    mockApplyRateLimit.mockResolvedValue({
      allowed: true,
      result: {
        allowed: true,
        remaining: 59,
        limit: 60,
        resetAt: new Date(Date.now() + 60_000),
      },
    });
  });

  it("returns 422 when consent fields are missing", async () => {
    mockValidateApiKey.mockResolvedValue({
      type: "apikey",
      apiKeyId: "key-001",
      rateLimitPerMin: 60,
      getTenantId: () => TENANT_ID,
      withTransaction: vi.fn(),
    });

    const validationError = Object.assign(
      new Error("Validation failed"),
      { statusCode: 422, details: { consent: ["Required"] } },
    );
    mockCreateInstitutionalLead.mockRejectedValue(validationError);

    const request = new Request(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "test-key" },
      body: JSON.stringify({
        name: "Test User",
        email: TEST_EMAIL,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 201 when consent fields are present", async () => {
    const leadId = "00000000-0000-4000-8000-000000000050";
    const consentId = "00000000-0000-4000-8000-000000000060";

    mockValidateApiKey.mockResolvedValue({
      type: "apikey",
      apiKeyId: "key-001",
      rateLimitPerMin: 60,
      getTenantId: () => TENANT_ID,
      withTransaction: vi.fn(),
    });

    mockCreateInstitutionalLead.mockResolvedValue({
      leadId,
      consentId,
      emailQueueId: "email-789",
    });

    const request = new Request(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "test-key" },
      body: JSON.stringify({
        name: "Test User",
        email: TEST_EMAIL,
        phone: "+34600123456",
        message: "Quiero información",
        promocionId: "00000000-0000-4000-8000-000000000040",
        tipologiaId: "00000000-0000-4000-8000-000000000041",
        consent: {
          legalBasis: TEST_CONSENT_BASIS,
          textAccepted: "Acepto la política de privacidad",
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.leadId).toBe(leadId);
    expect(body.consentId).toBe(consentId);
    expect(body.emailQueueId).toBe("email-789");
  });

  it("returns 401 when auth fails", async () => {
    mockValidateApiKey.mockRejectedValue(
      new ContextResolutionError("Missing API key", 401),
    );

    const request = new Request(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: TEST_EMAIL,
        consent: { legalBasis: TEST_CONSENT_BASIS, textAccepted: "Acepto" },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockValidateApiKey.mockResolvedValue({
      type: "apikey",
      apiKeyId: "key-001",
      rateLimitPerMin: 60,
      getTenantId: () => TENANT_ID,
      withTransaction: vi.fn(),
    });

    // Simulate rate limit exceeded
    mockApplyRateLimit.mockResolvedValue({
      allowed: false,
      result: {
        allowed: false,
        remaining: 0,
        limit: 60,
        resetAt: new Date(Date.now() + 60_000),
      },
    });

    const request = new Request(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "test-key" },
      body: JSON.stringify({
        name: "Test User",
        email: TEST_EMAIL,
        consent: { legalBasis: TEST_CONSENT_BASIS, textAccepted: "Acepto" },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.error).toBe("Rate limit exceeded");
  });
});
