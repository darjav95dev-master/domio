/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapPromocion } from "./MapPromocion";

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
// Tests
// ---------------------------------------------------------------------------

describe("MapPromocion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapConstructorArgs = null;
  });

  it("renders a map container with EXACT privacy mode", () => {
    render(
      <MapPromocion
        coordinates={[EXACT_LNG, EXACT_LAT]}
        mode="EXACT"
        name="Test Promo"
      />,
    );

    const container = screen.getByTestId("map-promocion");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("data-privacy-mode", "EXACT");
  });

  it("renders a map container with AREA privacy mode", () => {
    render(
      <MapPromocion
        coordinates={[APPROX_LNG, APPROX_LAT]}
        mode="AREA"
        name="Test Promo"
      />,
    );

    const container = screen.getByTestId("map-promocion");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("data-privacy-mode", "AREA");
  });

  it("has proper aria-label", () => {
    render(
      <MapPromocion
        coordinates={[EXACT_LNG, EXACT_LAT]}
        mode="EXACT"
        name="Test Promo"
      />,
    );

    expect(screen.getByLabelText("Mapa de ubicación")).toBeInTheDocument();
  });

  it("cleans up map on unmount", () => {
    const { unmount } = render(
      <MapPromocion
        coordinates={[EXACT_LNG, EXACT_LAT]}
        mode="EXACT"
        name="Test Promo"
      />,
    );
    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Privacy mode — coordinate isolation
  // -------------------------------------------------------------------------

  it("uses exact location coordinates when mode is EXACT", () => {
    render(
      <MapPromocion
        coordinates={[EXACT_LNG, EXACT_LAT]}
        mode="EXACT"
        name="Test Promo"
      />,
    );

    expect(mapConstructorArgs).not.toBeNull();
    const center = mapConstructorArgs!.center as [number, number];
    // Exact coordinates used
    expect(center[0]).toBe(EXACT_LNG);
    expect(center[1]).toBe(EXACT_LAT);
  });

  it("uses approximate coordinates when mode is AREA", () => {
    render(
      <MapPromocion
        coordinates={[APPROX_LNG, APPROX_LAT]}
        mode="AREA"
        name="Test Promo"
      />,
    );

    expect(mapConstructorArgs).not.toBeNull();
    const center = mapConstructorArgs!.center as [number, number];
    // AREA mode uses approximate coordinates
    expect(center[0]).toBe(APPROX_LNG);
    expect(center[1]).toBe(APPROX_LAT);
    // Verify exact coordinates are NOT used
    expect(center[0]).not.toBe(EXACT_LNG);
    expect(center[1]).not.toBe(EXACT_LAT);
  });

  it("has larger zoom in EXACT mode (15) than AREA mode (13)", () => {
    const { unmount } = render(
      <MapPromocion
        coordinates={[EXACT_LNG, EXACT_LAT]}
        mode="EXACT"
        name="Test Promo"
      />,
    );
    expect(mapConstructorArgs!.zoom).toBe(15);
    unmount();

    mapConstructorArgs = null;
    render(
      <MapPromocion
        coordinates={[APPROX_LNG, APPROX_LAT]}
        mode="AREA"
        name="Test Promo"
      />,
    );
    expect(mapConstructorArgs!.zoom).toBe(13);
  });

  it("renders with proper attributes in AREA mode", () => {
    render(
      <MapPromocion
        coordinates={[APPROX_LNG, APPROX_LAT]}
        mode="AREA"
        name="Test Residencial"
      />,
    );

    // The section has aria-label="Mapa de ubicación"
    expect(screen.getByLabelText("Mapa de ubicación")).toBeInTheDocument();
    // Render should complete without error
    expect(screen.getByTestId("map-promocion")).toHaveAttribute(
      "data-privacy-mode",
      "AREA",
    );
  });
});
