"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogFilters {
  island?: string;
  municipality?: string;
  propertyType?: string;
  operation?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];
  constructionStatus?: string;
}

export type FilterKey = keyof CatalogFilters;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function parseFiltersFromParams(
  searchParams: URLSearchParams,
): CatalogFilters {
  const amenitiesParam = searchParams.get("amenities");
  return {
    island: searchParams.get("island") ?? undefined,
    municipality: searchParams.get("municipality") ?? undefined,
    propertyType: searchParams.get("propertyType") ?? undefined,
    operation: searchParams.get("operation") ?? undefined,
    priceMin: _parseInt(searchParams.get("priceMin")),
    priceMax: _parseInt(searchParams.get("priceMax")),
    bedrooms: _parseInt(searchParams.get("bedrooms")),
    bathrooms: _parseInt(searchParams.get("bathrooms")),
    amenities: amenitiesParam ? amenitiesParam.split(",") : [],
    constructionStatus: searchParams.get("constructionStatus") ?? undefined,
  };
}

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [filters, setFilters] = useState<CatalogFilters>(() =>
    parseFiltersFromParams(searchParams),
  );

  /**
   * Builds a URLSearchParams string from a CatalogFilters object,
   * excluding undefined values and empty arrays.
   */
  const filtersToParams = useCallback(
    (f: CatalogFilters): string => {
      const params = new URLSearchParams();
      if (f.island) params.set("island", f.island);
      if (f.municipality) params.set("municipality", f.municipality);
      if (f.propertyType) params.set("propertyType", f.propertyType);
      if (f.operation) params.set("operation", f.operation);
      if (f.priceMin) params.set("priceMin", String(f.priceMin));
      if (f.priceMax) params.set("priceMax", String(f.priceMax));
      if (f.bedrooms) params.set("bedrooms", String(f.bedrooms));
      if (f.bathrooms) params.set("bathrooms", String(f.bathrooms));
      if (f.amenities.length > 0)
        params.set("amenities", f.amenities.join(","));
      if (f.constructionStatus)
        params.set("constructionStatus", f.constructionStatus);
      return params.toString();
    },
    [],
  );

  // Sync filter state to URL — runs after render, never during
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const qs = filtersToParams(filters);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, router, pathname, filtersToParams]);

  /**
   * Updates a single filter and pushes the new URL.
   */
  const setFilter = useCallback(
    (key: FilterKey, value: string | number | undefined | null) => {
      setFilters((prev) => {
        const next = { ...prev };
        if (value === undefined || value === null || value === "") {
          if (key === "amenities") {
            next.amenities = [];
          } else {
            delete next[key as keyof typeof next];
          }
        } else {
          (next as Record<string, unknown>)[key] = value;
        }
        return next;
      });
    },
    [],
  );

  /**
   * Toggles an amenity in the amenities array.
   */
  const toggleAmenity = useCallback(
    (amenity: string) => {
      setFilters((prev) => {
        const list = [...prev.amenities];
        const index = list.indexOf(amenity);
        if (index === -1) { list.push(amenity); } else { list.splice(index, 1); }
        return { ...prev, amenities: list };
      });
    },
    [],
  );

  /**
   * Clears all filters.
   */
  const clearFilters = useCallback(() => {
    setFilters({
      island: undefined,
      municipality: undefined,
      propertyType: undefined,
      operation: undefined,
      priceMin: undefined,
      priceMax: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      amenities: [],
      constructionStatus: undefined,
    });
  }, []);

  /**
   * Count of active (set) filters.
   */
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.island) count++;
    if (filters.municipality) count++;
    if (filters.propertyType) count++;
    if (filters.operation) count++;
    if (filters.priceMin) count++;
    if (filters.priceMax) count++;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.constructionStatus) count++;
    return count;
  }, [filters]);

  return { filters, setFilter, toggleAmenity, clearFilters, activeCount };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _parseInt(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}
