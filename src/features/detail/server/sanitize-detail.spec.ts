import { describe, it, expect } from "vitest";
import { sanitizeForClient } from "./get-detail-data";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Test coordinates
// ---------------------------------------------------------------------------

const EXACT_LNG = -16.2518;
const EXACT_LAT = 28.468;
const APPROX_LNG = -16.25;
const APPROX_LAT = 28.47;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDetail(
  overrides: Partial<PromocionDetail> = {},
): PromocionDetail {
  return {
    id: "promo-1",
    tenantId: "tenant-1",
    slug: "test-promo",
    name: "Test Promo",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "piso",
    constructionStatus: null,
    island: "Tenerife",
    municipality: "Santa Cruz",
    address: null,
    location: [EXACT_LNG, EXACT_LAT] as [number, number],
    locationApprox: [APPROX_LNG, APPROX_LAT] as [number, number],
    mapPrivacyMode: "EXACT",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    assignedAgentName: null,
    draftPayload: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    tipologias: [],
    contentBlocks: [],
    mediaAssets: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sanitizeForClient", () => {
  it("keeps exact location when mapPrivacyMode is EXACT", () => {
    const detail = createMockDetail({ mapPrivacyMode: "EXACT" });
    const result = sanitizeForClient(detail);

    expect(result.location).toEqual([EXACT_LNG, EXACT_LAT]);
    // Exact should NOT equal approximate
    expect(result.location).not.toEqual([APPROX_LNG, APPROX_LAT]);
    // locationApprox should remain unchanged
    expect(result.locationApprox).toEqual([APPROX_LNG, APPROX_LAT]);
  });

  it("overwrites location with locationApprox when mapPrivacyMode is AREA", () => {
    const detail = createMockDetail({ mapPrivacyMode: "AREA" });
    const result = sanitizeForClient(detail);

    // Exact coordinates MUST NOT appear
    expect(result.location).not.toEqual([EXACT_LNG, EXACT_LAT]);
    // location should equal locationApprox
    expect(result.location).toEqual([APPROX_LNG, APPROX_LAT]);
    // locationApprox should remain unchanged
    expect(result.locationApprox).toEqual([APPROX_LNG, APPROX_LAT]);
  });

  it("does not mutate the original object", () => {
    const detail = createMockDetail({ mapPrivacyMode: "AREA" });
    const originalLocation = detail.location;

    sanitizeForClient(detail);

    // Original should still have exact coordinates
    expect(detail.location).toEqual(originalLocation);
    expect(detail.location).toEqual([EXACT_LNG, EXACT_LAT]);
  });

  it("preserves all other fields unchanged", () => {
    const detail = createMockDetail({ mapPrivacyMode: "AREA" });
    const result = sanitizeForClient(detail);

    // Check that other key fields are preserved
    expect(result.id).toBe("promo-1");
    expect(result.slug).toBe("test-promo");
    expect(result.name).toBe("Test Promo");
    expect(result.municipality).toBe("Santa Cruz");
    expect(result.status).toBe("PUBLISHED");
    expect(result.mapPrivacyMode).toBe("AREA");
    // Tipologias, contentBlocks, mediaAssets should be preserved
    expect(result.tipologias).toEqual([]);
    expect(result.contentBlocks).toEqual([]);
    expect(result.mediaAssets).toEqual([]);
  });
});
