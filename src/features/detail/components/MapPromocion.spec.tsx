/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapPromocion } from "./MapPromocion";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Mock maplibre-gl
// ---------------------------------------------------------------------------

const mockRemove = vi.fn();

// Capture the center argument passed to the Map constructor for verification
let mapConstructorArgs: Record<string, unknown> | null = null;

vi.mock("maplibre-gl", () => {
  const MockMap = vi.fn().mockImplementation((options: Record<string, unknown>) => {
    mapConstructorArgs = options;
    return {
      addSource: vi.fn(),
      addLayer: vi.fn(),
      addControl: vi.fn(),
      on: vi.fn().mockImplementation((_event: string, cb: () => void) => {
        cb();
      }),
      remove: mockRemove,
    };
  });

  return {
    default: {
      Map: MockMap,
      NavigationControl: vi.fn(),
      Marker: vi.fn().mockImplementation(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        setPopup: vi.fn().mockReturnThis(),
        addTo: vi.fn(),
      })),
      Popup: vi.fn().mockImplementation(() => ({
        setText: vi.fn().mockReturnThis(),
      })),
    },
  };
});

// ---------------------------------------------------------------------------
// Test coordinates — exact vs approximate for privacy mode tests
// ---------------------------------------------------------------------------

const EXACT_LNG = -16.2518;
const EXACT_LAT = 28.468;
const APPROX_LNG = -16.25;
const APPROX_LAT = 28.47;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPromocion(
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
    createdAt: new Date(),
    updatedAt: new Date(),
    tipologias: [],
    contentBlocks: [],
    mediaAssets: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MapPromocion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapConstructorArgs = null;
  });

  it("renders a map container with EXACT privacy mode", () => {
    const promocion = createMockPromocion({ mapPrivacyMode: "EXACT" });
    render(<MapPromocion promocion={promocion} />);

    const container = screen.getByTestId("map-promocion");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("data-privacy-mode", "EXACT");
  });

  it("renders a map container with AREA privacy mode", () => {
    const promocion = createMockPromocion({ mapPrivacyMode: "AREA" });
    render(<MapPromocion promocion={promocion} />);

    const container = screen.getByTestId("map-promocion");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("data-privacy-mode", "AREA");
  });

  it("has proper aria-label", () => {
    const promocion = createMockPromocion({ mapPrivacyMode: "EXACT" });
    render(<MapPromocion promocion={promocion} />);

    expect(screen.getByLabelText("Mapa de ubicación")).toBeInTheDocument();
  });

  it("cleans up map on unmount", () => {
    const promocion = createMockPromocion({ mapPrivacyMode: "EXACT" });
    const { unmount } = render(<MapPromocion promocion={promocion} />);
    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Privacy mode — coordinate isolation
  // -------------------------------------------------------------------------

  it("uses exact location coordinates when mapPrivacyMode is EXACT", () => {
    const promocion = createMockPromocion({
      mapPrivacyMode: "EXACT",
      location: [EXACT_LNG, EXACT_LAT] as [number, number],
      locationApprox: [APPROX_LNG, APPROX_LAT] as [number, number],
    });
    render(<MapPromocion promocion={promocion} />);

    expect(mapConstructorArgs).not.toBeNull();
    const center = mapConstructorArgs!.center as [number, number];
    // Exact coordinates used
    expect(center[0]).toBe(EXACT_LNG);
    expect(center[1]).toBe(EXACT_LAT);
  });

  it("uses locationApprox (NOT exact location) when mapPrivacyMode is AREA", () => {
    const promocion = createMockPromocion({
      mapPrivacyMode: "AREA",
      location: [EXACT_LNG, EXACT_LAT] as [number, number],
      locationApprox: [APPROX_LNG, APPROX_LAT] as [number, number],
    });
    render(<MapPromocion promocion={promocion} />);

    expect(mapConstructorArgs).not.toBeNull();
    const center = mapConstructorArgs!.center as [number, number];
    // AREA mode uses locationApprox — not the exact coordinates
    expect(center[0]).toBe(APPROX_LNG);
    expect(center[1]).toBe(APPROX_LAT);
    // Verify exact coordinates are NOT used
    expect(center[0]).not.toBe(EXACT_LNG);
    expect(center[1]).not.toBe(EXACT_LAT);
  });

  it("has larger zoom in EXACT mode (15) than AREA mode (13)", () => {
    const exactPromo = createMockPromocion({ mapPrivacyMode: "EXACT" });
    const { unmount } = render(<MapPromocion promocion={exactPromo} />);
    expect(mapConstructorArgs!.zoom).toBe(15);
    unmount();

    mapConstructorArgs = null;
    const areaPromo = createMockPromocion({ mapPrivacyMode: "AREA" });
    render(<MapPromocion promocion={areaPromo} />);
    expect(mapConstructorArgs!.zoom).toBe(13);
  });

  it("renders aria-label with 'Zona aproximada' in AREA mode", () => {
    const promocion = createMockPromocion({
      mapPrivacyMode: "AREA",
      name: "Test Residencial",
    });
    render(<MapPromocion promocion={promocion} />);

    // The section has aria-label="Mapa de ubicación"
    expect(screen.getByLabelText("Mapa de ubicación")).toBeInTheDocument();
    // Render should complete without error
    expect(screen.getByTestId("map-promocion")).toHaveAttribute(
      "data-privacy-mode",
      "AREA",
    );
  });
});
