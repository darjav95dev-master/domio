import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockSession = vi.hoisted(() => ({
  getServerSession: vi.fn<
    () => Promise<{
      userId: string;
      tenantId: string;
      role: string;
      name: string | null;
    } | null>
  >(),
}));

const mockFindAll = vi.fn();
const mockCreate = vi.fn();

const mockRepository = vi.hoisted(() => ({
  PromocionRepository: vi.fn(),
}));

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockSession.getServerSession,
}));

vi.mock(
  "@/infrastructure/db/repositories/promocion.repository",
  () => ({
    PromocionRepository: mockRepository.PromocionRepository,
  }),
);

const { GET, POST } = await import(
  "@/../app/api/internal/promociones/route"
);

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:3000/api/internal/promociones";

const VALID_KIND = "portfolio";
const TEST_NAME = "Test Promoción";

const validSession = {
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN" as const,
  name: "Test Admin",
};

const mockPromocionRow = {
  id: "prom-1",
  tenantId: "tenant-1",
  slug: "",
  name: TEST_NAME,
  kind: VALID_KIND,
  status: "DRAFT",
  operation: null,
  propertyType: null,
  constructionStatus: null,
  island: null,
  municipality: null,
  address: null,
  location: [0, 0] as [number, number],
  locationApprox: [0, 0] as [number, number],
  mapPrivacyMode: "EXACT",
  seoTitle: null,
  seoDescription: null,
  assignedAgentId: null,
  draftPayload: null,
  createdAt: new Date("2026-07-08T10:00:00Z"),
  updatedAt: new Date("2026-07-08T10:00:00Z"),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/internal/promociones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAll.mockReset();
  });

  it("returns 200 with paginated results when session is valid", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);

    const mockFindAllImpl = mockFindAll.mockResolvedValue({
      items: [mockPromocionRow],
      total: 1,
    });
    mockRepository.PromocionRepository.mockImplementation(() => ({
      findAll: mockFindAllImpl,
    }));

    const request = new Request(
      `${BASE_URL}?page=1&limit=50`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page", 1);
    expect(body).toHaveProperty("limit", 50);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("returns 401 when no session (GET)", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const request = new Request(BASE_URL);
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
  });

  it("passes query params as filters to findAll", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);

    const mockFindAllImpl = mockFindAll.mockResolvedValue({
      items: [],
      total: 0,
    });
    mockRepository.PromocionRepository.mockImplementation(() => ({
      findAll: mockFindAllImpl,
    }));

    const request = new Request(
      `${BASE_URL}?status=PUBLISHED&kind=portfolio&island=Tenerife&municipality=Santa+Cruz&assignedAgentId=agent-1&constructionStatus=READY&page=2&limit=25`,
    );
    await GET(request);

    expect(mockFindAllImpl).toHaveBeenCalledWith(
      {
        status: "PUBLISHED",
        kind: "portfolio",
        island: "Tenerife",
        municipality: "Santa Cruz",
        assignedAgentId: "agent-1",
        constructionStatus: "READY",
      },
      2,
      25,
    );
  });

  it("returns 500 with Internal server error when repository throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);

    const mockFindAllImpl = mockFindAll.mockRejectedValue(
      new Error("DB error"),
    );
    mockRepository.PromocionRepository.mockImplementation(() => ({
      findAll: mockFindAllImpl,
    }));

    const request = new Request(
      BASE_URL,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Internal server error");
  });
});

describe("POST /api/internal/promociones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReset();
  });

  it("returns 201 with created promoción when body is valid", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);

    const mockCreateImpl = mockCreate.mockResolvedValue(mockPromocionRow);
    mockRepository.PromocionRepository.mockImplementation(() => ({
      create: mockCreateImpl,
    }));

    const request = new Request(
      BASE_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: TEST_NAME, kind: VALID_KIND }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      id: "prom-1",
      name: TEST_NAME,
      kind: VALID_KIND,
      status: "DRAFT",
    });
  });

  it("returns 401 when no session (POST)", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const request = new Request(
      BASE_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: TEST_NAME, kind: VALID_KIND }),
      },
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 400 with field errors when body validation fails", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);

    const request = new Request(
BASE_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "AB" }), // too short (min 3) and missing kind
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Validation failed");
    expect(body).toHaveProperty("details");
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("returns 500 with Internal server error when repository.create throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);

    const mockCreateImpl = mockCreate.mockRejectedValue(
      new Error("DB error"),
    );
    mockRepository.PromocionRepository.mockImplementation(() => ({
      create: mockCreateImpl,
    }));

    const request = new Request(
      BASE_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: TEST_NAME, kind: VALID_KIND }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Internal server error");
  });
});
