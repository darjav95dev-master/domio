import { describe, it, expect } from "vitest";
import { promocionResponseSchema } from "@/features/api-public/schemas/promocion-response.schema";
import { serializePromocion } from "@/features/api-public/serializers/promocion-serializer";

describe("Promocion Response Contract (v1)", () => {
  const NOW_DATE = "2026-07-08T12:00:00.000Z";
  const NOW = new Date(NOW_DATE);

  const VALID_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const VALID_SLUG = "piso-en-venta-en-santa-cruz-3hab-a4c9";
  const VALID_NAME = "Piso en Santa Cruz";

  const baseRow = {
    id: VALID_ID,
    tenantId: "tenant-1",
    slug: VALID_SLUG,
    name: VALID_NAME,
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "piso" as const,
    constructionStatus: null,
    island: "Tenerife",
    municipality: "Santa Cruz",
    address: "Calle Principal 123",
    location: [-16.254, 28.468] as [number, number],
    locationApprox: [-16.254, 28.468] as [number, number],
    mapPrivacyMode: "EXACT" as const,
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    assignedAgentName: null,
    draftPayload: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  describe("PromocionResponse schema validation", () => {
    const buildResponse = (overrides: Record<string, unknown> = {}) => ({
      id: VALID_ID,
      slug: VALID_SLUG,
      nombre: VALID_NAME,
      tipo: "piso",
      operacion: "SALE",
      isla: "Tenerife",
      municipio: "Santa Cruz",
      mapPrivacyMode: "EXACT",
      location: { lat: 28.468, lng: -16.254 },
      locationApprox: { lat: 28.468, lng: -16.254 },
      precioMin: 150000,
      precioMax: 200000,
      superficieMin: 80,
      superficieMax: 100,
      dormitorios: 3,
      banios: 2,
      updatedAt: NOW_DATE,
      ...overrides,
    });

    it("should validate a complete EXACT response", () => {
      const result = promocionResponseSchema.safeParse(buildResponse());
      expect(result.success).toBe(true);
    });

    it("should validate an AREA response without location", () => {
      const response = buildResponse({
        mapPrivacyMode: "AREA",
        location: undefined,
        precioMin: null,
        precioMax: null,
        superficieMin: null,
        superficieMax: null,
        dormitorios: null,
        banios: null,
      });
      const result = promocionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.location).toBeUndefined();
      }
    });

    it("should reject response with invalid mapPrivacyMode", () => {
      const response = buildResponse({
        mapPrivacyMode: "INVALID",
        precioMin: null,
        precioMax: null,
        superficieMin: null,
        superficieMax: null,
        dormitorios: null,
        banios: null,
      });
      const result = promocionResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should reject response without locationApprox", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { locationApprox, ...withoutApprox } = buildResponse({
        mapPrivacyMode: "AREA",
        location: undefined,
        precioMin: null,
        precioMax: null,
        superficieMin: null,
        superficieMax: null,
        dormitorios: null,
        banios: null,
      });
      const result = promocionResponseSchema.safeParse(withoutApprox);
      expect(result.success).toBe(false);
    });
  });

  describe("Serialization respects map_privacy_mode", () => {
    it("should include location when EXACT", () => {
      const serialized = serializePromocion(baseRow);
      expect(serialized.location).toBeDefined();
      expect(serialized.locationApprox).toBeDefined();
    });

    it("should omit location when AREA", () => {
      const row = { ...baseRow, mapPrivacyMode: "AREA" as const };
      const serialized = serializePromocion(row);
      expect(serialized.location).toBeUndefined();
      expect(serialized.locationApprox).toBeDefined();
    });

    it("serialized EXACT response validates against schema", () => {
      const serialized = serializePromocion(baseRow);
      const result = promocionResponseSchema.safeParse(serialized);
      expect(result.success).toBe(true);
    });

    it("serialized AREA response validates against schema", () => {
      const row = { ...baseRow, mapPrivacyMode: "AREA" as const };
      const serialized = serializePromocion(row);
      const result = promocionResponseSchema.safeParse(serialized);
      expect(result.success).toBe(true);
    });
  });

  describe("Cursor pagination format", () => {
    it("should produce a valid cursor string from serialized response", () => {
      const serialized = serializePromocion({
        ...baseRow,
        updatedAt: new Date("2026-07-08T12:00:00.000Z"),
      });

      expect(serialized.updatedAt).toBe(NOW_DATE);
    });
  });

  // NOTE: Snapshot comparison moved to snapshot-divergence.contract.spec.ts (M2)
});
