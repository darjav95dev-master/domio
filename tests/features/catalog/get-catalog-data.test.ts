/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

// Must be before imports — vi.mock hoists to top
const mockFindPublicWithCursor = vi.fn();
const mockFindCardExtras = vi.fn();

vi.mock("@/infrastructure/db/repositories/catalog.repository", () => ({
  CatalogRepository: vi.fn().mockImplementation(() => ({
    findPublicWithCursor: mockFindPublicWithCursor,
    findCardExtras: mockFindCardExtras,
  })),
}));

vi.mock("@/infrastructure/tenant/PublicContext", () => ({
  PublicContext: vi.fn().mockImplementation(() => ({
    type: "public" as const,
    getTenantId: () => "00000000-0000-0000-0000-000000000001",
    withTransaction: vi.fn(),
    resolveFilters: () => ({ status: "PUBLISHED" as const }),
  })),
}));

import { getCatalogData } from "@/features/catalog/server/get-catalog-data";

describe("getCatalogData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getCatalogData enriches items via findCardExtras; default to no extras.
    mockFindCardExtras.mockResolvedValue(new Map());
  });

  it("validates filters with zod schema — rejects invalid property type", async () => {
    await expect(
      getCatalogData({ propertyType: "invalid_type" as any }),
    ).rejects.toThrow();
  });

  it("validates filters with zod schema — rejects invalid operation", async () => {
    await expect(
      getCatalogData({ operation: "INVALID" as any }),
    ).rejects.toThrow();
  });

  it("validates filters with zod schema — rejects negative price", async () => {
    await expect(getCatalogData({ priceMin: -100 })).rejects.toThrow();
  });

  it("validates filters with zod schema — rejects invalid sort option", async () => {
    await expect(
      getCatalogData({ sort: "invalid_sort" as any }),
    ).rejects.toThrow();
  });

  it("returns correct data shape from repository", async () => {
    const mockItems = [
      {
        id: "p1",
        slug: "test-promo",
        name: "Test",
        kind: "portfolio",
        status: "PUBLISHED",
      },
    ];

    mockFindPublicWithCursor.mockResolvedValueOnce({
      items: mockItems,
      nextCursor: "next-cursor-abc",
      total: 1,
    });

    const result = await getCatalogData({ island: "Tenerife" });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("nextCursor");
    expect(result).toHaveProperty("total");
    expect(result.items).toHaveLength(1);
  });

  it("passes cursor to repository correctly", async () => {
    mockFindPublicWithCursor.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      total: 0,
    });

    await getCatalogData({
      cursor: "some-encoded-cursor",
      limit: 10,
      sort: "price_asc",
    });

    expect(mockFindPublicWithCursor).toHaveBeenCalledWith(
      expect.objectContaining({}),
      expect.objectContaining({
        cursor: "some-encoded-cursor",
        limit: 10,
        sort: "price_asc",
      }),
    );
  });

  it("applies default limit of 12 when not specified", async () => {
    mockFindPublicWithCursor.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      total: 0,
    });

    await getCatalogData({});

    expect(mockFindPublicWithCursor).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ limit: 12 }),
    );
  });

  it("handles all valid filters", async () => {
    mockFindPublicWithCursor.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      total: 0,
    });

    await getCatalogData({
      island: "Tenerife",
      municipality: "Santa Cruz",
      propertyType: "piso",
      operation: "SALE",
      priceMin: 100000,
      priceMax: 500000,
      bedrooms: 3,
      bathrooms: 2,
      amenities: ["ascensor", "terraza"],
      constructionStatus: "ON_PLAN",
    });

    expect(mockFindPublicWithCursor).toHaveBeenCalledWith(
      expect.objectContaining({
        island: "Tenerife",
        municipality: "Santa Cruz",
        propertyType: "piso",
        operation: "SALE",
        priceMin: 100000,
        priceMax: 500000,
        bedrooms: 3,
        bathrooms: 2,
        amenities: ["ascensor", "terraza"],
        constructionStatus: "ON_PLAN",
      }),
      expect.any(Object),
    );
  });
});
