import type { PromocionListRow } from "@/infrastructure/db/repositories/promocion.repository";
import type { PromocionResponse } from "../schemas/promocion-response.schema";

/**
 * Serializa una promocion para la respuesta de la API pública v1.
 *
 * Reglas:
 * - Si map_privacy_mode = 'AREA', omite el campo `location` (solo devuelve `locationApprox`).
 * - Si map_privacy_mode = 'EXACT', incluye ambos.
 * - Los arrays de coordenadas [lng, lat] se convierten a { lat, lng }.
 *
 * Los campos de precios, superficies, dormitorios y baños se dejan como null
 * por ahora (se poblarán desde tipologías en una versión futura del endpoint).
 */
export function serializePromocion(row: PromocionListRow): PromocionResponse {
  const toLatLng = (coord: [number, number] | null): { lat: number; lng: number } | null => {
    if (!coord) return null;
    // Location is stored as [lng, lat] (GeoJSON convention)
    return { lat: coord[1] ?? 0, lng: coord[0] ?? 0 };
  };

  const hasExactLocation = row.mapPrivacyMode === "EXACT";

  const response: PromocionResponse = {
    id: row.id,
    slug: row.slug,
    nombre: row.name,
    tipo: row.propertyType,
    operacion: row.operation,
    isla: row.island,
    municipio: row.municipality,
    mapPrivacyMode: row.mapPrivacyMode as "EXACT" | "AREA",
    locationApprox: toLatLng(row.locationApprox) ?? { lat: 0, lng: 0 },
    precioMin: null,
    precioMax: null,
    superficieMin: null,
    superficieMax: null,
    dormitorios: null,
    banios: null,
    updatedAt: row.updatedAt instanceof Date
      ? row.updatedAt.toISOString()
      : String(row.updatedAt),
  };

  if (hasExactLocation) {
    response.location = toLatLng(row.location) ?? { lat: 0, lng: 0 };
  }

  return response;
}
