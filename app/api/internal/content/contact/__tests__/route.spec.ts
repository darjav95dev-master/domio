/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks — MUST be defined before vi.mock calls
// ---------------------------------------------------------------------------

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockSaveContactConfig = vi.hoisted(() => vi.fn());
const mockFindByTenant = vi.hoisted(() => vi.fn());

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/features/contenidos/actions/contact-config.actions", () => ({
  saveContactConfig: mockSaveContactConfig,
}));

vi.mock("@/features/contenidos/server/contact-config.repository", () => ({
  ContactConfigRepository: vi.fn(() => ({
    findByTenant: mockFindByTenant,
    upsert: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const adminSession = {
  userId: "admin-1",
  tenantId: "tenant-1",
  role: "ADMIN" as const,
  name: "Admin",
};

const agentSession = {
  userId: "agent-1",
  tenantId: "tenant-1",
  role: "AGENT" as const,
  name: "Agent",
};

function createMockRequest(
  method: "GET" | "PUT",
  body?: Record<string, unknown>,
): NextRequest {
  const url = "http://localhost:3000/api/internal/content/contact";
  const init: RequestInit = { method };

  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }

  return new Request(url, init) as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// GET /api/internal/content/contact
// ---------------------------------------------------------------------------

describe("GET /api/internal/content/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { GET } = await import("../route");
    const response = await GET(createMockRequest("GET"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 403 when user has AGENT role", async () => {
    mockGetServerSession.mockResolvedValue(agentSession);

    const { GET } = await import("../route");
    const response = await GET(createMockRequest("GET"));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 with contact config when it exists", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    const mockContact = {
      tenantId: "tenant-1",
      phone: "+34 900 123 456",
      email: "info@domio.es",
      address: "Calle Ejemplo 123",
      hours: "Lun-Vie 9:00-18:00",
      whatsappNumber: "+34 600 123 456",
      whatsappPrefilledMessage: "Hola, me interesa una propiedad",
      updatedBy: "admin-1",
      updatedAt: new Date("2026-07-08T12:00:00Z"),
    };
    mockFindByTenant.mockResolvedValue(mockContact);

    const { GET } = await import("../route");
    const response = await GET(createMockRequest("GET"));

    expect(response.status).toBe(200);
    const body = await response.json();
    // JSON serializes Date to ISO string — compare the expected serialized form
    expect(body.contact).toEqual({
      ...mockContact,
      updatedAt: mockContact.updatedAt.toISOString(),
    });
    expect(mockFindByTenant).toHaveBeenCalledWith(adminSession.tenantId);
  });

  it("returns 200 with null contact when no config exists", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockFindByTenant.mockResolvedValue(null);

    const { GET } = await import("../route");
    const response = await GET(createMockRequest("GET"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.contact).toBeNull();
  });

  it("returns 500 when repository throws", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockFindByTenant.mockRejectedValue(new Error("DB error"));

    const { GET } = await import("../route");
    const response = await GET(createMockRequest("GET"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});

// ---------------------------------------------------------------------------
// PUT /api/internal/content/contact
// ---------------------------------------------------------------------------

describe("PUT /api/internal/content/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { PUT } = await import("../route");
    const response = await PUT(
      createMockRequest("PUT", { phone: "+34 900 123 456" }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 403 when user has AGENT role", async () => {
    mockGetServerSession.mockResolvedValue(agentSession);

    const { PUT } = await import("../route");
    const response = await PUT(
      createMockRequest("PUT", { phone: "+34 900 123 456" }),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when action returns error for invalid email", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockSaveContactConfig.mockResolvedValue({
      success: false,
      error: "Payload inválido",
      details: [{ path: ["email"], message: "Invalid email" }],
    });

    const { PUT } = await import("../route");
    const response = await PUT(
      createMockRequest("PUT", {
        phone: "+34 900 123 456",
        email: "not-an-email",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Payload inválido");
    expect(body.details).toBeDefined();
  });

  it("returns 400 when action returns error for empty required data", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockSaveContactConfig.mockResolvedValue({
      success: false,
      error: "Payload inválido",
    });

    const { PUT } = await import("../route");
    const response = await PUT(createMockRequest("PUT", {}));

    expect(response.status).toBe(400);
  });

  it("returns 200 when action succeeds", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockSaveContactConfig.mockResolvedValue({ success: true });

    const { PUT } = await import("../route");
    const response = await PUT(
      createMockRequest("PUT", {
        phone: "+34 900 123 456",
        email: "info@domio.es",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockSaveContactConfig).toHaveBeenCalledWith({
      phone: "+34 900 123 456",
      email: "info@domio.es",
    });
  });
});
