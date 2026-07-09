import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_URL = "https://domio.com/api/v1/leads/institutional";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

// ---------------------------------------------------------------------------
// Mocks — using vi.hoisted for proper hoisting with vi.mock
// ---------------------------------------------------------------------------
const mockValidateApiKey = vi.hoisted(() => vi.fn());
const mockCreateInstitutionalLead = vi.hoisted(() => vi.fn());

vi.mock("@/features/api-public/middleware/api-key-auth", () => ({
  validateApiKey: mockValidateApiKey,
}));

vi.mock("@/features/api-public/with-rate-limit", () => ({
  withRateLimit: vi.fn((handler: Function) => handler as never),
}));

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
  });

  it("returns 422 when consent fields are missing", async () => {
    mockValidateApiKey.mockResolvedValue({
      type: "apikey",
      apiKeyId: "key-001",
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
        email: "test@example.com",
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
        email: "test@example.com",
        phone: "+34600123456",
        message: "Quiero información",
        promocionId: "00000000-0000-4000-8000-000000000040",
        tipologiaId: "00000000-0000-4000-8000-000000000041",
        consent: {
          legalBasis: "RGPD consent",
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
        email: "test@example.com",
        consent: { legalBasis: "RGPD consent", textAccepted: "Acepto" },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
