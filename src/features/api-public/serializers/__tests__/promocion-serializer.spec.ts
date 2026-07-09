import { describe, it, expect } from "vitest";
import { serializePromocion } from "../promocion-serializer";
import { promocionResponseSchema } from "../../schemas/promocion-response.schema";

describe("serializePromocion", () => {
  const NOW = new Date("2026-07-08T12:00:00.000Z");

  const basePromocionRow = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    tenantId: "tenant-1",
    slug: "piso-en-venta-en-santa-cruz-3hab-a4c9",
    name: "Piso en Santa Cruz de Tenerife",
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "piso" as const,
    constructionStatus: null,
    island: "Tenerife",
    municipality: "Santa Cruz",
    address: "Calle Principal 123",
    location: [-16.254, 28.468] as [number, number],
    locationApprox: [-16.2541, 28.4679] as [number, number],
    mapPrivacyMode: "EXACT" as const,
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    assignedAgentName: null,
    draftPayload: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("should serialize a promocion with EXACT mode including location", () => {
    const result = serializePromocion(basePromocionRow);

    expect(result).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      nombre: basePromocionRow.name,
      tipo: basePromocionRow.propertyType,
      operacion: basePromocionRow.operation,
      isla: basePromocionRow.island,
      municipio: basePromocionRow.municipality,
      mapPrivacyMode: "EXACT",
      location: { lat: 28.468, lng: -16.254 },
      locationApprox: { lat: 28.4679, lng: -16.2541 },
      updatedAt: expect.any(String),
    });
    expect(result.location).toBeDefined();
  });

  it("should omit location when map_privacy_mode is AREA", () => {
    const row = { ...basePromocionRow, mapPrivacyMode: "AREA" as const };
    const result = serializePromocion(row);

    expect(result.mapPrivacyMode).toBe("AREA");
    expect(result.location).toBeUndefined();
    expect(result.locationApprox).toBeDefined();
  });

  it("should include location when map_privacy_mode is EXACT", () => {
    const row = { ...basePromocionRow, mapPrivacyMode: "EXACT" as const };
    const result = serializePromocion(row);

    expect(result.mapPrivacyMode).toBe("EXACT");
    expect(result.location).toBeDefined();
    expect(result.locationApprox).toBeDefined();
  });

  it("should set precioMin and precioMax to null by default", () => {
    const result = serializePromocion(basePromocionRow);
    expect(result.precioMin).toBeNull();
    expect(result.precioMax).toBeNull();
  });

  it("should set superficieMin and superficieMax to null by default", () => {
    const result = serializePromocion(basePromocionRow);
    expect(result.superficieMin).toBeNull();
    expect(result.superficieMax).toBeNull();
  });

  it("should set dormitorios and banios to null by default", () => {
    const result = serializePromocion(basePromocionRow);
    expect(result.dormitorios).toBeNull();
    expect(result.banios).toBeNull();
  });

  it("should produce a response that validates against promocionResponseSchema", () => {
    const result = serializePromocion(basePromocionRow);
    const parsed = promocionResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("should produce a valid response for AREA mode", () => {
    const row = { ...basePromocionRow, mapPrivacyMode: "AREA" as const };
    const result = serializePromocion(row);
    const parsed = promocionResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    // location should be absent
    if (parsed.success) {
      expect(parsed.data.location).toBeUndefined();
    }
  });

  it("should format updatedAt as ISO datetime string", () => {
    const result = serializePromocion(basePromocionRow);
    expect(result.updatedAt).toBe("2026-07-08T12:00:00.000Z");
  });
});
