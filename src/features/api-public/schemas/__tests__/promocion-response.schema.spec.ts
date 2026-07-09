import { describe, it, expect } from "vitest";
import { promocionResponseSchema } from "../promocion-response.schema";

describe("promocionResponseSchema", () => {
  const validResponse = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    slug: "piso-en-venta-en-santa-cruz-3hab-a4c9",
    nombre: "Piso en Santa Cruz",
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
    updatedAt: "2026-07-08T12:00:00.000Z",
  };

  it("should accept a valid response with EXACT mode including location", () => {
    const result = promocionResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("should accept a valid response with EXACT mode without location (optional)", () => {
    const withoutLocation = { ...validResponse };
    delete (withoutLocation as Record<string, unknown>).location;
    const result = promocionResponseSchema.safeParse(withoutLocation);
    expect(result.success).toBe(true);
  });

  it("should accept a valid response with AREA mode without location", () => {
    const areaResponse = { ...validResponse, mapPrivacyMode: "AREA" };
    delete (areaResponse as Record<string, unknown>).location;
    const result = promocionResponseSchema.safeParse(areaResponse);
    expect(result.success).toBe(true);
  });

  it("should reject response with invalid mapPrivacyMode", () => {
    const result = promocionResponseSchema.safeParse({
      ...validResponse,
      mapPrivacyMode: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("should reject response without required id", () => {
    const withoutId = { ...validResponse };
    delete (withoutId as Record<string, unknown>).id;
    const result = promocionResponseSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it("should reject response without required nombre", () => {
    const withoutNombre = { ...validResponse };
    delete (withoutNombre as Record<string, unknown>).nombre;
    const result = promocionResponseSchema.safeParse(withoutNombre);
    expect(result.success).toBe(false);
  });

  it("should reject response without locationApprox", () => {
    const withoutApprox = { ...validResponse };
    delete (withoutApprox as Record<string, unknown>).locationApprox;
    const result = promocionResponseSchema.safeParse(withoutApprox);
    expect(result.success).toBe(false);
  });

  it("should reject invalid lat/lng types in location", () => {
    const result = promocionResponseSchema.safeParse({
      ...validResponse,
      location: { lat: "not-a-number", lng: -16.254 },
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid updatedAt format", () => {
    const result = promocionResponseSchema.safeParse({
      ...validResponse,
      updatedAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});
