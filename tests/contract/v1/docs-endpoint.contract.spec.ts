import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Tests for GET /api/internal/docs
//
// Verifies that the OpenAPI spec endpoint:
// - Returns 401 without a valid session
// - Returns 200 with valid JSON OpenAPI spec when authenticated
// ---------------------------------------------------------------------------

const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

import { GET } from "@app/api/internal/docs/route";

const TEST_TENANT_ID = "tenant-001";

describe("GET /api/internal/docs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when no session exists", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  it("should return 200 with valid OpenAPI spec when authenticated", async () => {
    mockGetServerSession.mockResolvedValue({
      userId: "user-001",
      tenantId: TEST_TENANT_ID,
      role: "ADMIN",
      name: "Admin User",
    });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const spec = await response.json();

    expect(spec).toHaveProperty("openapi");
    expect(typeof spec.openapi).toBe("string");
    expect((spec.openapi as string).startsWith("3.0")).toBe(true);

    expect(spec).toHaveProperty("paths");
    const paths = spec.paths as Record<string, unknown>;
    expect(paths["/api/v1/promociones"]).toBeDefined();
    expect(paths["/api/v1/leads/institutional"]).toBeDefined();

    expect(spec).toHaveProperty("info");
    expect((spec.info as Record<string, unknown>).title).toBe("Domio API v1");
  });

  it("should return 200 for operator role too", async () => {
    mockGetServerSession.mockResolvedValue({
      userId: "user-002",
      tenantId: TEST_TENANT_ID,
      role: "OPERATOR",
      name: "Operator User",
    });

    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("should return 200 for agent role too", async () => {
    mockGetServerSession.mockResolvedValue({
      userId: "user-003",
      tenantId: TEST_TENANT_ID,
      role: "AGENT",
      name: "Agent User",
    });

    const response = await GET();
    expect(response.status).toBe(200);
  });
});
