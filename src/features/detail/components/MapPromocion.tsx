"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MapPromocionProps {
  /** [lng, lat] coordinates — exact or approximate depending on mode */
  coordinates: [number, number];
  /** Map privacy mode: "EXACT" for marker, "AREA" for circle */
  mode: "EXACT" | "AREA";
  /** Promotion name for aria-labels and popups */
  name: string;
}

/**
 * MapPromocion — Client Component that renders a maplibre-gl map with OSM tiles.
 *
 * Receives only the minimal data needed to render the map. The SERVER is
 * responsible for determining which coordinates to send: exact `location`
 * in EXACT mode, or `locationApprox` in AREA mode. This component NEVER
 * receives exact coordinates in AREA mode.
 *
 * Privacy mode:
 * - EXACT: renders a marker at the exact coordinates.
 * - AREA: renders a circle centered at approximate coordinates with ~500m radius.
 *
 * @see sanitizeForClient in get-detail-data.ts for server-side sanitization.
 */
export function MapPromocion({ coordinates, mode, name }: MapPromocionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const isExact = mode === "EXACT";
  const [lng, lat] = coordinates;

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
      zoom: isExact ? 15 : 13,
      attributionControl: {
        compact: true,
      },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (isExact) {
        // EXACT mode: add a marker at the precise location
        const el = document.createElement("div");
        el.className = "map-marker";
        el.style.cssText = `
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--accent-default, #C75D3F);
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,.3);
          cursor: pointer;
        `;
        el.setAttribute("aria-label", `Ubicación de ${name}`);

        new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setText(name),
          )
          .addTo(map);
      } else {
        // AREA mode: draw a circle around the approximate location
        map.addSource("privacy-area", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
          },
        });

        // Add a semi-transparent circle layer
        map.addLayer({
          id: "privacy-circle-fill",
          type: "circle",
          source: "privacy-area",
          paint: {
            "circle-radius": 500,
            "circle-color": "rgba(199,93,63,0.15)",
            "circle-stroke-color": "rgba(199,93,63,0.5)",
            "circle-stroke-width": 2,
          },
        });

        // Add a marker at the approximate center
        const el = document.createElement("div");
        el.className = "map-marker-area";
        el.style.cssText = `
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent-default, #C75D3F);
          border: 2px solid #fff;
          opacity: 0.7;
          box-shadow: 0 1px 4px rgba(0,0,0,.2);
        `;
        el.setAttribute(
          "aria-label",
          `Zona aproximada de ${name}`,
        );

        new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lng, lat, isExact, name]);

  return (
    <section aria-label="Mapa de ubicación" className="overflow-hidden rounded-surface">
      <div
        ref={containerRef}
        className="h-[320px] w-full md:h-[400px]"
        data-privacy-mode={mode}
        data-testid="map-promocion"
      />
    </section>
  );
}
