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

const mockFindById = vi.fn();
const mockGetHistory = vi.fn();

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

const { GET } = await import(
  "@/../app/api/internal/promociones/[id]/history/route"
);

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:3000/api/internal/promociones";

const validSession = {
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN" as const,
  name: "Test Admin",
};

const agentSession = {
  userId: "agent-1",
  tenantId: "tenant-1",
  role: "AGENT" as const,
  name: "Test Agent",
};

// Date constants used across mock objects
const DATE_10AM = new Date("2026-07-08T10:00:00Z");
const DATE_11AM = new Date("2026-07-08T11:00:00Z");
const DATE_12PM = new Date("2026-07-08T12:00:00Z");

const mockPromocionWithRelations = {
  id: "prom-1",
  tenantId: "tenant-1",
  slug: "test-promocion",
  name: "Test Promoción",
  kind: "portfolio",
  status: "PUBLISHED",
  operation: "SALE",
  propertyType: "piso",
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
  assignedAgentName: null,
  draftPayload: null,
  createdAt: DATE_10AM,
  updatedAt: DATE_10AM,
  tipologias: [],
};

const PROMOCION_ID = "prom-1";

const mockHistoryItems = [
  {
    id: "hist-3",
    tenantId: "tenant-1",
    promocionId: PROMOCION_ID,
    field: "name",
    oldValue: '"Old Name"',
    newValue: '"New Name"',
    authorId: "user-1",
    authorName: "Admin User",
    createdAt: DATE_12PM,
  },
  {
    id: "hist-2",
    tenantId: "tenant-1",
    promocionId: PROMOCION_ID,
    field: "status",
    oldValue: '"DRAFT"',
    newValue: '"PUBLISHED"',
    authorId: "user-2",
    authorName: "Operator User",
    createdAt: DATE_11AM,
  },
  {
    id: "hist-1",
    tenantId: "tenant-1",
    promocionId: PROMOCION_ID,
    field: "operation",
    oldValue: null,
    newValue: '"SALE"',
    authorId: "user-1",
    authorName: null,
    createdAt: DATE_10AM,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRepositoryImpl(overrides?: {
  findById?: typeof mockFindById;
  getHistory?: typeof mockGetHistory;
}) {
  mockRepository.PromocionRepository.mockImplementation(() => ({
    findById: overrides?.findById ?? mockFindById,
    getHistory: overrides?.getHistory ?? mockGetHistory,
  }));
}

// ---------------------------------------------------------------------------
// GET /api/internal/promociones/[id]/history
// ---------------------------------------------------------------------------

describe("GET /api/internal/promociones/[id]/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockReset();
    mockGetHistory.mockReset();
  });

  it("returns 200 with history items sorted by createdAt DESC", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockGetHistory.mockResolvedValue(mockHistoryItems);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body.items).toHaveLength(3);

    // Items should be in createdAt DESC order (already sorted by repository)
    expect(body.items[0].id).toBe("hist-3");
    expect(body.items[1].id).toBe("hist-2");
    expect(body.items[2].id).toBe("hist-1");
  });

  it("returns each history item with all required fields", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockGetHistory.mockResolvedValue(mockHistoryItems);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    const item = body.items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("field");
    expect(item).toHaveProperty("oldValue");
    expect(item).toHaveProperty("newValue");
    expect(item).toHaveProperty("authorId");
    expect(item).toHaveProperty("authorName");
    expect(item).toHaveProperty("createdAt");
  });

  it("includes authorName when user exists", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockGetHistory.mockResolvedValue(mockHistoryItems);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(body.items[0].authorName).toBe("Admin User");
    expect(body.items[1].authorName).toBe("Operator User");
  });

  it("returns null authorName when user is deleted", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockGetHistory.mockResolvedValue(mockHistoryItems);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(body.items[2].authorName).toBeNull();
  });

  it("returns empty items array when no history exists", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockGetHistory.mockResolvedValue([]);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual([]);
  });

  it("returns 401 when no session", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 404 with Promoción not found when promocion does not exist", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(null);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Promoción not found");
  });

  it("returns 403 with Forbidden when AGENT tries to view history of non-assigned promocion", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      assignedAgentId: "other-agent",
    });
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 when AGENT views history of their own promocion", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      assignedAgentId: "agent-1",
    });
    mockGetHistory.mockResolvedValue([]);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual([]);
  });

  it("returns 500 with Internal server error when repository.getHistory throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockGetHistory.mockRejectedValue(new Error("DB error"));
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}/history`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Internal server error");
  });
});
