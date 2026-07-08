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
const mockUpdateDraft = vi.fn();

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

const { PATCH, DELETE } = await import(
  "@/../app/api/internal/promociones/[id]/draft/route"
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
const DATE_12PM = new Date("2026-07-08T12:00:00Z");

const mockPromocionWithRelations = {
  id: "prom-1",
  tenantId: "tenant-1",
  slug: "",
  name: "Test Promoción",
  kind: "portfolio",
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
  assignedAgentName: null,
  draftPayload: null,
  createdAt: DATE_10AM,
  updatedAt: DATE_10AM,
  tipologias: [],
};

const mockPromocionRow = {
  id: "prom-1",
  tenantId: "tenant-1",
  slug: "",
  name: "Test Promoción",
  kind: "portfolio",
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
  createdAt: DATE_10AM,
  updatedAt: DATE_10AM,
};

const PROMOCION_ID = "prom-1";

const validDraftBody = {
  name: "Borrador test",
  kind: "portfolio",
  status: "DRAFT",
  municipality: "Santa Cruz",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRepositoryImpl(overrides?: {
  findById?: typeof mockFindById;
  updateDraft?: typeof mockUpdateDraft;
}) {
  mockRepository.PromocionRepository.mockImplementation(() => ({
    findById: overrides?.findById ?? mockFindById,
    updateDraft: overrides?.updateDraft ?? mockUpdateDraft,
  }));
}

// ---------------------------------------------------------------------------
// PATCH /api/internal/promociones/[id]/draft
// ---------------------------------------------------------------------------

describe("PATCH /api/internal/promociones/[id]/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockReset();
    mockUpdateDraft.mockReset();
  });

  it("returns 200 with draftPayload and updatedAt when body is valid", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    const updatedAt = DATE_12PM;
    mockUpdateDraft.mockResolvedValue({
      ...mockPromocionRow,
      draftPayload: validDraftBody,
      updatedAt,
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validDraftBody),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("draftPayload");
    expect(body.draftPayload).toEqual(validDraftBody);
    expect(body).toHaveProperty("updatedAt");
  });

  it("returns 401 when no session (PATCH)", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validDraftBody),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 400 with Validation failed when body validation fails", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "AB" }), // name too short + missing kind/status
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Validation failed");
    expect(body).toHaveProperty("details");
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("returns 400 when body is not valid JSON", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error");
  });

  it("returns 404 with Promoción not found when promocion does not exist", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(null);
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validDraftBody),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Promoción not found");
  });

  it("returns 403 with Forbidden when AGENT tries to draft non-assigned promocion", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      assignedAgentId: "other-agent",
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validDraftBody),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 when AGENT drafts their own promocion", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      assignedAgentId: "agent-1",
    });
    const updatedAt = DATE_12PM;
    mockUpdateDraft.mockResolvedValue({
      ...mockPromocionRow,
      draftPayload: validDraftBody,
      updatedAt,
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validDraftBody),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.draftPayload).toEqual(validDraftBody);
  });

  it("does NOT call repository.update (only updateDraft)", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    const updatedAt = DATE_12PM;
    mockUpdateDraft.mockResolvedValue({
      ...mockPromocionRow,
      draftPayload: validDraftBody,
      updatedAt,
    });
    mockRepositoryImpl();

    await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validDraftBody),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    // updateDraft should have been called, but NOT the regular update
    expect(mockUpdateDraft).toHaveBeenCalledWith(
      PROMOCION_ID,
      validDraftBody,
    );
  });

  it("returns 500 with Internal server error when repository.updateDraft throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockUpdateDraft.mockRejectedValue(new Error("DB error"));
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validDraftBody),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Internal server error");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/internal/promociones/[id]/draft
// ---------------------------------------------------------------------------

describe("DELETE /api/internal/promociones/[id]/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockReset();
    mockUpdateDraft.mockReset();
  });

  it("returns 200 with draftPayload=null when draft is discarded", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockUpdateDraft.mockResolvedValue({
      ...mockPromocionRow,
      draftPayload: null,
    });
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.draftPayload).toBeNull();
    expect(body).toHaveProperty("updatedAt");
  });

  it("calls updateDraft with null to clear draftPayload", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockUpdateDraft.mockResolvedValue({
      ...mockPromocionRow,
      draftPayload: null,
    });
    mockRepositoryImpl();

    await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(mockUpdateDraft).toHaveBeenCalledWith(PROMOCION_ID, null);
  });

  it("returns 401 when no session", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 404 when promocion does not exist", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(null);
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Promoción not found");
  });

  it("returns 403 when AGENT tries to discard draft of non-assigned promocion", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      assignedAgentId: "other-agent",
    });
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 500 when repository.updateDraft throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockUpdateDraft.mockRejectedValue(new Error("DB error"));
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}/draft`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});
