import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_URL = "https://domio.com/api/v1/leads/institutional";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const PROMOCION_ID = "00000000-0000-4000-8000-000000000040";
const SOURCE = "institutional";
const TEST_NAME = "Test User";
const TEST_EMAIL = "test@example.com";
const CONSENT_BASIS = "RGPD consent";
const CONSENT_TEXT = "Acepto la política de privacidad";

// ---------------------------------------------------------------------------
// Mocks for tenant context middleware
// ---------------------------------------------------------------------------
const mockWithTx = vi.fn();
const mockCtx = {
  getTenantId: () => TENANT_ID,
  withTransaction: mockWithTx,
};

vi.mock("@/infrastructure/tenant/context-middleware", () => ({
  resolveTenantContext: vi.fn(() => mockCtx),
  tenantContextStorage: {
    run: vi.fn(
      <T>(_ctx: unknown, fn: () => T): T => fn(),
    ),
  },
  ContextResolutionError: class MockContextResolutionError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
      this.name = "ContextResolutionError";
    }
  },
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
import { POST } from "@app/api/v1/leads/institutional/route";
import { resolveTenantContext } from "@/infrastructure/tenant/context-middleware";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/v1/leads/institutional", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Restore default mock behavior
    vi.mocked(resolveTenantContext).mockReturnValue(mockCtx);
  });

  it("returns 422 when consent fields are missing", async () => {
    const request = new NextRequest(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        promocionId: PROMOCION_ID,
        source: SOURCE,
        name: TEST_NAME,
        email: TEST_EMAIL,
        // Missing consentLegalBasis and consentTextAccepted
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toBe("El consentimiento RGPD es obligatorio");
    expect(body.details).toBeDefined();
  });

  it("returns 201 when consent fields are present", async () => {
    const leadId = "00000000-0000-4000-8000-000000000050";
    const consentId = "00000000-0000-4000-8000-000000000060";
    mockWithTx.mockResolvedValue({ leadId, consentId });

    const request = new NextRequest(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        promocionId: PROMOCION_ID,
        tipologiaId: "00000000-0000-4000-8000-000000000041",
        source: SOURCE,
        channel: "FORM",
        name: TEST_NAME,
        email: TEST_EMAIL,
        phone: "+34600123456",
        message: "Quiero información",
        consentLegalBasis: CONSENT_BASIS,
        consentTextAccepted: CONSENT_TEXT,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.leadId).toBe(leadId);
    expect(body.consentId).toBe(consentId);
  });

  it("returns error when context resolution fails", async () => {
    const { ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    vi.mocked(resolveTenantContext).mockImplementation(() => {
      throw new ContextResolutionError("Missing or invalid API key", 401);
    });

    const request = new NextRequest(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        promocionId: PROMOCION_ID,
        source: SOURCE,
        name: TEST_NAME,
        email: TEST_EMAIL,
        consentLegalBasis: CONSENT_BASIS,
        consentTextAccepted: CONSENT_TEXT,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Missing or invalid API key");
  });
});
