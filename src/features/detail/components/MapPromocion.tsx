"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MapPromocionProps {
  promocion: PromocionDetail;
}

/**
 * MapPromocion — Client Component that renders a maplibre-gl map with OSM tiles.
 *
 * Privacy mode:
 * - EXACT: renders a marker at the exact coordinates (detail.location).
 * - AREA: renders a circle centered at locationApprox with ~500m radius.
 *         Exact coordinates NEVER reach the client — the server only
 *         sends locationApprox in AREA mode.
 */
export function MapPromocion({ promocion }: MapPromocionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const isExact = promocion.mapPrivacyMode === "EXACT";
  // In AREA mode, the server ensures locationApprox is sent but location
  // is never exposed. We use whichever coordinates are available.
  const coordinates = isExact ? promocion.location : promocion.locationApprox;
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
        el.setAttribute("aria-label", `Ubicación de ${promocion.name}`);

        new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setText(promocion.name),
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
          `Zona aproximada de ${promocion.name}`,
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
  }, [lng, lat, isExact, promocion.name]);

  return (
    <section aria-label="Mapa de ubicación" className="overflow-hidden rounded-surface">
      <div
        ref={containerRef}
        className="h-[320px] w-full md:h-[400px]"
        data-privacy-mode={promocion.mapPrivacyMode}
        data-testid="map-promocion"
      />
    </section>
  );
}
