import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock ApiKeyContext ──────────────────────────────────────────────────────

vi.mock("@/infrastructure/tenant/ApiKeyContext", () => ({
  ApiKeyContext: vi.fn().mockImplementation((tenantId: string, apiKeyId: string) => ({
    type: "apikey" as const,
    apiKeyId,
    getTenantId: () => tenantId,
    withTransaction: vi.fn(),
    resolveFilters: () => ({ kind: "portfolio" as const, status: "PUBLISHED" as const }),
  })),
}));

// ─── Mock CatalogRepository ───────────────────────────────────────────────────

const mockFindForApiCursor = vi.fn();
const mockCatalogRepository = vi.fn().mockImplementation(() => ({
  findForApiCursor: mockFindForApiCursor,
}));

vi.mock("@/infrastructure/db/repositories/catalog.repository", () => ({
  CatalogRepository: mockCatalogRepository,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getPromociones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const NOW = new Date("2026-07-08T12:00:00Z");

  const mockPromocionRow = {
    id: "promo-1",
    tenantId: "tenant-1",
    slug: "piso-en-venta-en-santa-cruz-3hab-a4c9",
    name: "Piso en Santa Cruz",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "piso",
    island: "Tenerife",
    municipality: "Santa Cruz",
    location: [-16.254, 28.468] as [number, number],
    locationApprox: [-16.254, 28.468] as [number, number],
    mapPrivacyMode: "EXACT",
    assignedAgentId: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("should return promociones with default limit", async () => {
    const { getPromociones } = await import("../get-promociones");

    mockFindForApiCursor.mockResolvedValue({
      items: [mockPromocionRow],
      nextCursor: null,
      total: 1,
    });

    const ctx = { type: "apikey" as const, getTenantId: () => "tenant-1", apiKeyId: "key-1" };

    const result = await getPromociones({
      ctx: ctx as never,
    });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("nextCursor");
    expect(result).toHaveProperty("total", 1);
    expect(mockFindForApiCursor).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20 }),
    );
  });

  it("should pass custom limit", async () => {
    const { getPromociones } = await import("../get-promociones");

    mockFindForApiCursor.mockResolvedValue({
      items: [mockPromocionRow, mockPromocionRow],
      nextCursor: "next-cursor-abc",
      total: 15,
    });

    const ctx = { type: "apikey" as const, getTenantId: () => "tenant-1", apiKeyId: "key-1" };

    const result = await getPromociones({
      ctx: ctx as never,
      limit: 5,
    });

    expect(mockFindForApiCursor).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("next-cursor-abc");
  });

  it("should pass cursor to repository", async () => {
    const { getPromociones } = await import("../get-promociones");

    mockFindForApiCursor.mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const ctx = { type: "apikey" as const, getTenantId: () => "tenant-1", apiKeyId: "key-1" };

    await getPromociones({
      ctx: ctx as never,
      cursor: "some-cursor-value",
    });

    expect(mockFindForApiCursor).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: "some-cursor-value" }),
    );
  });

  it("should clamp limit to max 100", async () => {
    const { getPromociones } = await import("../get-promociones");

    mockFindForApiCursor.mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const ctx = { type: "apikey" as const, getTenantId: () => "tenant-1", apiKeyId: "key-1" };

    await getPromociones({
      ctx: ctx as never,
      limit: 999,
    });

    expect(mockFindForApiCursor).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  it("should default limit to 20 when not provided", async () => {
    const { getPromociones } = await import("../get-promociones");

    mockFindForApiCursor.mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const ctx = { type: "apikey" as const, getTenantId: () => "tenant-1", apiKeyId: "key-1" };

    await getPromociones({
      ctx: ctx as never,
    });

    expect(mockFindForApiCursor).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20 }),
    );
  });

  it("should return empty result when repository returns no items", async () => {
    const { getPromociones } = await import("../get-promociones");

    mockFindForApiCursor.mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const ctx = { type: "apikey" as const, getTenantId: () => "tenant-1", apiKeyId: "key-1" };

    const result = await getPromociones({
      ctx: ctx as never,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.nextCursor).toBeNull();
  });
});
