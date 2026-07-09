"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ---------------------------------------------------------------------------
// Default coordinates (Santa Cruz de Tenerife center)
// Used as fallback when contact_config lacks office coordinates.
// ---------------------------------------------------------------------------

const DEFAULT_COORDS: [number, number] = [-16.2518, 28.468];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OfficeMapProps {
  /** Office coordinates [lng, lat] — if null, uses default */
  coordinates?: [number, number] | null;
  /** Office address for the popup label */
  address?: string | null;
}

/**
 * OfficeMap — Client Component that renders a maplibre-gl map
 * showing the Domio office location.
 *
 * Uses OSM tiles (no paid API key required).
 * Coordinates are always EXACT mode (office location is public).
 */
export function OfficeMap({ coordinates, address }: OfficeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [lng, lat] = coordinates ?? DEFAULT_COORDS;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [lng, lat],
      zoom: 15,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Marker
      const el = document.createElement("div");
      el.style.cssText = `
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--accent-default, #C75D3F);
        border: 3px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,.3);
        cursor: pointer;
      `;
      el.setAttribute("aria-label", "Ubicación de la oficina");

      const popupText = address ?? "Domio — Oficina";
      new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setText(popupText))
        .addTo(map);
    });

    mapRef.current = map;

    cleanupRef.current = () => {
      map.remove();
      mapRef.current = null;
    };

    return () => {
      cleanupRef.current?.();
    };
  }, [lng, lat, address]);

  return (
    <section
      aria-label="Mapa de ubicación de la oficina"
      className="overflow-hidden rounded-surface"
    >
      <div
        ref={containerRef}
        className="h-[320px] w-full md:h-[400px]"
        data-testid="office-map"
      />
    </section>
  );
}
