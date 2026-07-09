/* eslint-disable sonarjs/no-duplicate-string */

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
const mockUpdate = vi.fn();
const mockDeleteFn = vi.fn();
const mockFindContentBlock = vi.fn();

const mockRepository = vi.hoisted(() => ({
  PromocionRepository: vi.fn(),
}));

const mockGenerateSlug = vi.hoisted(() => vi.fn());

const mockRevalidateTag = vi.hoisted(() => vi.fn());

const mockValidateMediaForPublish = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ valid: true }),
);

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockSession.getServerSession,
}));

vi.mock(
  "@/infrastructure/db/repositories/promocion.repository",
  () => ({
    PromocionRepository: mockRepository.PromocionRepository,
  }),
);

vi.mock(
  "@/infrastructure/db/repositories/promocion-content-block.repository",
  () => ({
    PromocionContentBlockRepository: mockRepository.PromocionRepository,
  }),
);

vi.mock("@/infrastructure/slug/generate-slug", () => ({
  generateSlug: mockGenerateSlug,
}));

vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
}));

vi.mock("@/features/promociones/actions/media.actions", () => ({
  validateMediaForPublish: mockValidateMediaForPublish,
}));

const { GET, PATCH, DELETE } = await import(
  "@/../app/api/internal/promociones/[id]/route"
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
  createdAt: new Date("2026-07-08T10:00:00Z"),
  updatedAt: new Date("2026-07-08T10:00:00Z"),
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
  createdAt: new Date("2026-07-08T10:00:00Z"),
  updatedAt: new Date("2026-07-08T10:00:00Z"),
};

const PROMOCION_ID = "prom-1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRepositoryImpl(overrides?: {
  findById?: typeof mockFindById;
  update?: typeof mockUpdate;
  delete?: typeof mockDeleteFn;
  findContentBlock?: typeof mockFindContentBlock;
}) {
  mockRepository.PromocionRepository.mockImplementation(() => ({
    findById: overrides?.findById ?? mockFindById,
    update: overrides?.update ?? mockUpdate,
    delete: overrides?.delete ?? mockDeleteFn,
    findContentBlock: overrides?.findContentBlock ?? mockFindContentBlock,
    validateBlocksForPublish: vi.fn().mockResolvedValue({ valid: true }),
  }));
}

// ---------------------------------------------------------------------------
// GET /api/internal/promociones/[id]
// ---------------------------------------------------------------------------

describe("GET /api/internal/promociones/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockReset();
    mockFindContentBlock.mockReset();
  });

  it("returns 200 with promocion data when session is valid", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockFindContentBlock.mockResolvedValue(null);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(PROMOCION_ID);
    expect(body.name).toBe("Test Promoción");
    expect(body.tipologias).toEqual([]);
    expect(body).toHaveProperty("constructionWarning");
    expect(body.constructionWarning).toBeNull();
  });

  it("returns 401 when no session (GET)", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
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
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Promoción not found");
  });

  it("returns 403 with Forbidden when AGENT tries to access non-assigned promocion", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      assignedAgentId: "other-agent",
    });
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 when AGENT accesses their own promocion", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      assignedAgentId: "agent-1",
    });
    mockFindContentBlock.mockResolvedValue(null);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(PROMOCION_ID);
  });

  it("returns constructionWarning when ON_PLAN and entrega_estimada in past", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      constructionStatus: "ON_PLAN",
    });
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    mockFindContentBlock.mockResolvedValue({
      entrega_estimada: pastDate.toISOString(),
    });
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.constructionWarning).not.toBeNull();
    expect(body.constructionWarning.type).toBe("CONSTRUCTION_WARNING");
  });

  it("returns null constructionWarning when no PLAZOS_GARANTIAS block exists", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      constructionStatus: "ON_PLAN",
    });
    mockFindContentBlock.mockResolvedValue(null);
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.constructionWarning).toBeNull();
  });

  it("returns null constructionWarning when constructionStatus is null", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockFindContentBlock.mockResolvedValue({
      entrega_estimada: "2025-01-01",
    });
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.constructionWarning).toBeNull();
  });

  it("returns 500 with Internal server error when repository throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockRejectedValue(new Error("DB error"));
    mockRepositoryImpl();

    const response = await GET(
      new Request(`${BASE_URL}/${PROMOCION_ID}`),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Internal server error");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/internal/promociones/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/internal/promociones/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockReset();
    mockUpdate.mockReset();
    mockFindContentBlock.mockReset();
    mockGenerateSlug.mockReset();
    mockRevalidateTag.mockReset();
  });

  it("returns 200 with updated promocion when body is valid", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockUpdate.mockResolvedValue({
      ...mockPromocionRow,
      name: "Updated Name",
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe("Updated Name");
  });

  it("returns 401 when no session (PATCH)", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
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
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "AB" }), // too short
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

  it("returns 403 with Forbidden when AGENT tries to edit non-assigned promocion", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      assignedAgentId: "other-agent",
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Forbidden");
  });

  it("generates slug when status changes to PUBLISHED and slug is empty", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      tipologias: [{ bedrooms: 3 }],
    });
    mockGenerateSlug.mockReturnValue("piso-en-venta-en-santa-cruz-3hab-prom");
    mockUpdate.mockResolvedValue({
      ...mockPromocionRow,
      status: "PUBLISHED",
      slug: "piso-en-venta-en-santa-cruz-3hab-prom",
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          propertyType: "piso",
          operation: "SALE",
          municipality: "Santa Cruz",
          mapPrivacyMode: "EXACT",
          name: "Test Promoción",
        }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateSlug).toHaveBeenCalled();
    expect(body.slug).toBe("piso-en-venta-en-santa-cruz-3hab-prom");
  });

  it("does NOT change slug when status changes to PUBLISHED but slug already exists", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      slug: "existing-slug",
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
    });
    mockUpdate.mockResolvedValue({
      ...mockPromocionRow,
      slug: "existing-slug",
      status: "PUBLISHED",
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          propertyType: "piso",
          operation: "SALE",
          municipality: "Santa Cruz",
          mapPrivacyMode: "EXACT",
          name: "Test Promoción",
        }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateSlug).not.toHaveBeenCalled();
    expect(body.slug).toBe("existing-slug");
  });

  it("applies draftPayload when publishing from draft", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      draftPayload: {
        municipality: "Santa Cruz",
        island: "Tenerife",
        address: "Calle Mayor 1",
      },
      tipologias: [{ bedrooms: 2 }],
    });
    mockGenerateSlug.mockReturnValue("piso-en-venta-en-santa-cruz-2hab-prom");
    mockUpdate.mockResolvedValue({
      ...mockPromocionRow,
      name: "Test Promoción",
      status: "PUBLISHED",
      slug: "piso-en-venta-en-santa-cruz-2hab-prom",
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      island: "Tenerife",
      address: "Calle Mayor 1",
      mapPrivacyMode: "EXACT",
      draftPayload: null,
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          name: "Test Promoción",
          propertyType: "piso",
          operation: "SALE",
          mapPrivacyMode: "EXACT",
        }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(response.status).toBe(200);
    // draftPayload fields (municipality, island, address) should have been merged
    expect(mockUpdate).toHaveBeenCalledWith(
      PROMOCION_ID,
      expect.objectContaining({
        name: "Test Promoción",
        status: "PUBLISHED",
        propertyType: "piso",
        operation: "SALE",
        mapPrivacyMode: "EXACT",
        municipality: "Santa Cruz",
        island: "Tenerife",
        address: "Calle Mayor 1",
        slug: "piso-en-venta-en-santa-cruz-2hab-prom",
        draftPayload: null,
      }),
    );
  });

  it("body fields override draftPayload when publishing from draft", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      draftPayload: {
        name: "Draft Name",
        municipality: "Santa Cruz",
        island: "Tenerife",
      },
    });
    mockGenerateSlug.mockReturnValue("piso-en-venta-en-santa-cruz-2hab-prom");
    mockUpdate.mockResolvedValue({
      ...mockPromocionRow,
      name: "Overridden Name",
      status: "PUBLISHED",
      slug: "piso-en-venta-en-santa-cruz-2hab-prom",
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      island: "Tenerife",
      mapPrivacyMode: "EXACT",
      draftPayload: null,
    });
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          name: "Overridden Name",
          propertyType: "piso",
          operation: "SALE",
          mapPrivacyMode: "EXACT",
        }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      PROMOCION_ID,
      expect.objectContaining({
        name: "Overridden Name", // from body (overrides draft)
        status: "PUBLISHED",
        municipality: "Santa Cruz", // from draft
        island: "Tenerife", // from draft
        draftPayload: null,
      }),
    );
  });

  it("calls revalidateTag when promocion is published and has slug", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      slug: "existing-slug",
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
    });
    mockUpdate.mockResolvedValue({
      ...mockPromocionRow,
      slug: "existing-slug",
      status: "PUBLISHED",
    });
    mockRepositoryImpl();

    await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(mockRevalidateTag).toHaveBeenCalledWith(
      "promocion:existing-slug",
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith("catalog");
  });

  it("returns 500 with Internal server error when repository.update throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockUpdate.mockRejectedValue(new Error("DB error"));
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Internal server error");
  });

  it("passes tipologias to repository.update when provided in body", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockUpdate.mockResolvedValue(mockPromocionRow);
    mockRepositoryImpl();

    const tipologiaPayload = [
      {
        _tempId: "t1",
        name: "Tipología 1",
        bedrooms: 3,
        bathrooms: 2,
        unidades: [
          { _tempId: "u1", status: "AVAILABLE", identifier: "1A" },
        ],
      },
    ];

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          tipologias: tipologiaPayload,
        }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      PROMOCION_ID,
      expect.objectContaining({
        name: "Updated Name",
        tipologias: tipologiaPayload,
      }),
    );
  });

  it("does not include tipologias in repository.update when not provided in body", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockUpdate.mockResolvedValue(mockPromocionRow);
    mockRepositoryImpl();

    const response = await PATCH(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      PROMOCION_ID,
      expect.not.objectContaining({
        tipologias: expect.anything(),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/internal/promociones/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/internal/promociones/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockReset();
    mockDeleteFn.mockReset();
    mockRevalidateTag.mockReset();
  });

  it("returns 204 when promocion is deleted", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockDeleteFn.mockResolvedValue(mockPromocionRow);
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(response.status).toBe(204);
  });

  it("returns 401 when no session (DELETE)", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 403 with Forbidden when AGENT tries to delete", async () => {
    mockSession.getServerSession.mockResolvedValue(agentSession);
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Forbidden");
  });

  it("calls revalidateTag when deleted promocion was published", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue({
      ...mockPromocionWithRelations,
      slug: "published-slug",
    });
    mockDeleteFn.mockResolvedValue({
      ...mockPromocionRow,
      slug: "published-slug",
    });
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(response.status).toBe(204);
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      "promocion:published-slug",
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith("catalog");
  });

  it("does NOT call revalidateTag when deleted promocion was draft (no slug)", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockDeleteFn.mockResolvedValue(mockPromocionRow);
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );

    expect(response.status).toBe(204);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 500 with Internal server error when repository.delete throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);
    mockFindById.mockResolvedValue(mockPromocionWithRelations);
    mockDeleteFn.mockRejectedValue(new Error("DB error"));
    mockRepositoryImpl();

    const response = await DELETE(
      new Request(`${BASE_URL}/${PROMOCION_ID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: PROMOCION_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Internal server error");
  });
});
