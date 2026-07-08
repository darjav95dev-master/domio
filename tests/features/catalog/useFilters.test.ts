import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock next/navigation before importing
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/portafolio",
}));

import { useFilters } from "@/features/catalog/hooks/useFilters";

describe("useFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams("");
  });

  it("returns default empty filters when no searchParams", () => {
    const { result } = renderHook(() => useFilters());
    expect(result.current.filters.island).toBeUndefined();
    expect(result.current.filters.municipality).toBeUndefined();
    expect(result.current.filters.propertyType).toBeUndefined();
    expect(result.current.filters.operation).toBeUndefined();
    expect(result.current.filters.priceMin).toBeUndefined();
    expect(result.current.filters.priceMax).toBeUndefined();
    expect(result.current.filters.bedrooms).toBeUndefined();
    expect(result.current.filters.bathrooms).toBeUndefined();
    expect(result.current.filters.amenities).toEqual([]);
    expect(result.current.filters.constructionStatus).toBeUndefined();
  });

  it("sets a filter value with setFilter and updates URL", () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.setFilter("island", "Tenerife");
    });

    expect(result.current.filters.island).toBe("Tenerife");
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("island=Tenerife"),
      expect.objectContaining({ scroll: false }),
    );
  });

  it("removes filter when setFilter is called with undefined", () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.setFilter("island", "Tenerife");
    });
    expect(result.current.filters.island).toBe("Tenerife");

    act(() => {
      result.current.setFilter("island", undefined);
    });

    expect(result.current.filters.island).toBeUndefined();
  });

  it("toggles an amenity in the amenities array", () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.toggleAmenity("ascensor");
    });
    expect(result.current.filters.amenities).toEqual(["ascensor"]);

    act(() => {
      result.current.toggleAmenity("terraza");
    });
    expect(result.current.filters.amenities).toEqual(["ascensor", "terraza"]);

    // Toggle off
    act(() => {
      result.current.toggleAmenity("ascensor");
    });
    expect(result.current.filters.amenities).toEqual(["terraza"]);
  });

  it("clears all filters with clearFilters", () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.setFilter("island", "Tenerife");
      result.current.setFilter("propertyType", "piso");
      result.current.setFilter("bedrooms", 3);
      result.current.toggleAmenity("ascensor");
    });

    expect(result.current.filters.island).toBe("Tenerife");

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.island).toBeUndefined();
    expect(result.current.filters.propertyType).toBeUndefined();
    expect(result.current.filters.bedrooms).toBeUndefined();
    expect(result.current.filters.amenities).toEqual([]);
  });

  it("returns correct active filter count", () => {
    const { result } = renderHook(() => useFilters());

    expect(result.current.activeCount).toBe(0);

    act(() => {
      result.current.setFilter("island", "Tenerife");
    });
    expect(result.current.activeCount).toBe(1);

    act(() => {
      result.current.setFilter("propertyType", "piso");
    });
    expect(result.current.activeCount).toBe(2);

    act(() => {
      result.current.toggleAmenity("ascensor");
    });
    expect(result.current.activeCount).toBe(3);
  });

  it("initializes filters from searchParams", () => {
    mockSearchParams = new URLSearchParams(
      "island=Tenerife&municipality=Santa+Cruz&operation=SALE",
    );
    const { result } = renderHook(() => useFilters());
    expect(result.current.filters.island).toBe("Tenerife");
    expect(result.current.filters.municipality).toBe("Santa Cruz");
    expect(result.current.filters.operation).toBe("SALE");
  });
});
