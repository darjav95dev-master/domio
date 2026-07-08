/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import {
  PromocionCreateSchema,
  PromocionUpdateSchema,
  PromocionDraftSchema,
} from "./promocion.schema";
import { TipologiaSchema } from "./tipologia.schema";
import { UnidadSchema } from "./unidad.schema";

const NOMBRE_PROMO = "Residencial Las Américas";

// ---------------------------------------------------------------------------
// PromocionCreateSchema
// ---------------------------------------------------------------------------

describe("PromocionCreateSchema", () => {
  const validCreate = {
    name: NOMBRE_PROMO,
    kind: "portfolio" as const,
  };

  it("acepta payload mínimo válido", () => {
    const result = PromocionCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it("rechaza name con menos de 3 caracteres", () => {
    const result = PromocionCreateSchema.safeParse({
      ...validCreate,
      name: "AB",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza name con más de 200 caracteres", () => {
    const result = PromocionCreateSchema.safeParse({
      ...validCreate,
      name: "X".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rechaza kind inválido", () => {
    const result = PromocionCreateSchema.safeParse({
      ...validCreate,
      kind: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("acepta kind = external", () => {
    const result = PromocionCreateSchema.safeParse({
      ...validCreate,
      kind: "external",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza payload vacío", () => {
    const result = PromocionCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rechaza name null", () => {
    const result = PromocionCreateSchema.safeParse({
      name: null,
      kind: "portfolio",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PromocionUpdateSchema
// ---------------------------------------------------------------------------

describe("PromocionUpdateSchema", () => {
  const validDraftUpdate = {
    name: NOMBRE_PROMO,
    status: "DRAFT" as const,
  };

  it("acepta payload mínimo para DRAFT (solo name)", () => {
    const result = PromocionUpdateSchema.safeParse(validDraftUpdate);
    expect(result.success).toBe(true);
  });

  it("acepta payload vacío para DRAFT (todos opcionales)", () => {
    const result = PromocionUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("acepta payload parcial para DRAFT", () => {
    const result = PromocionUpdateSchema.safeParse({
      name: "Nuevo nombre",
      island: "Tenerife",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza status inválido", () => {
    const result = PromocionUpdateSchema.safeParse({
      ...validDraftUpdate,
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  describe("cuando status = PUBLISHED", () => {
    const basePublished = {
      status: "PUBLISHED" as const,
    };

    it("rechaza PUBLICADO sin name", () => {
      const result = PromocionUpdateSchema.safeParse(basePublished);
      expect(result.success).toBe(false);
    });

    it("rechaza PUBLICADO sin operation", () => {
      const result = PromocionUpdateSchema.safeParse({
        ...basePublished,
        name: "Residencial",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza PUBLICADO sin propertyType", () => {
      const result = PromocionUpdateSchema.safeParse({
        ...basePublished,
        name: "Residencial",
        operation: "SALE",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza PUBLICADO sin mapPrivacyMode", () => {
      const result = PromocionUpdateSchema.safeParse({
        ...basePublished,
        name: "Residencial",
        operation: "SALE",
        propertyType: "piso",
      });
      expect(result.success).toBe(false);
    });

    it("acepta PUBLICADO con todos los campos requeridos", () => {
      const result = PromocionUpdateSchema.safeParse({
        ...basePublished,
        name: NOMBRE_PROMO,
        operation: "SALE",
        propertyType: "piso",
        mapPrivacyMode: "EXACT",
      });
      expect(result.success).toBe(true);
    });

    it("acepta PUBLICADO con campos opcionales adicionales", () => {
      const result = PromocionUpdateSchema.safeParse({
        ...basePublished,
        name: NOMBRE_PROMO,
        operation: "SALE",
        propertyType: "piso",
        constructionStatus: "ON_PLAN",
        mapPrivacyMode: "EXACT",
        island: "Tenerife",
        municipality: "Adeje",
        address: "Calle Principal 123",
        seoTitle: "Título SEO",
        seoDescription: "Descripción SEO",
        assignedAgentId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza propertyType inválido en PUBLICADO", () => {
      const result = PromocionUpdateSchema.safeParse({
        ...basePublished,
        name: "Residencial",
        operation: "SALE",
        propertyType: "nave-espacial",
        mapPrivacyMode: "EXACT",
      });
      expect(result.success).toBe(false);
    });
  });

  it("valida name dentro del rango 3-200 cuando se envía", () => {
    const r1 = PromocionUpdateSchema.safeParse({ name: "AB" });
    expect(r1.success).toBe(false);

    const r2 = PromocionUpdateSchema.safeParse({ name: "ABC" });
    expect(r2.success).toBe(true);

    const r3 = PromocionUpdateSchema.safeParse({ name: "X".repeat(201) });
    expect(r3.success).toBe(false);
  });

  describe("max length validations", () => {
    const longStr = (len: number) => "X".repeat(len + 1);

    it("rechaza island excesivo", () => {
      const r = PromocionUpdateSchema.safeParse({
        island: longStr(100),
      });
      expect(r.success).toBe(false);
    });

    it("rechaza municipality excesivo", () => {
      const r = PromocionUpdateSchema.safeParse({
        municipality: longStr(100),
      });
      expect(r.success).toBe(false);
    });

    it("rechaza address excesivo", () => {
      const r = PromocionUpdateSchema.safeParse({
        address: longStr(300),
      });
      expect(r.success).toBe(false);
    });

    it("rechaza seoTitle excesivo (>70)", () => {
      const r = PromocionUpdateSchema.safeParse({
        seoTitle: longStr(70),
      });
      expect(r.success).toBe(false);
    });

    it("rechaza seoDescription excesivo (>160)", () => {
      const r = PromocionUpdateSchema.safeParse({
        seoDescription: longStr(160),
      });
      expect(r.success).toBe(false);
    });
  });

  describe("location fields", () => {
    it("acepta location como { lng, lat }", () => {
      const r = PromocionUpdateSchema.safeParse({
        location: { lng: -16.5, lat: 28.1 },
      });
      expect(r.success).toBe(true);
    });

    it("acepta locationApprox como { lng, lat }", () => {
      const r = PromocionUpdateSchema.safeParse({
        locationApprox: { lng: -16.5, lat: 28.1 },
      });
      expect(r.success).toBe(true);
    });

    it("acepta location null", () => {
      const r = PromocionUpdateSchema.safeParse({
        location: null,
      });
      expect(r.success).toBe(true);
    });

    it("rechaza location sin lat", () => {
      const r = PromocionUpdateSchema.safeParse({
        location: { lng: -16.5 },
      });
      expect(r.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// PromocionDraftSchema
// ---------------------------------------------------------------------------

describe("PromocionDraftSchema", () => {
  it("acepta un snapshot completo del formulario", () => {
    const result = PromocionDraftSchema.safeParse({
      name: NOMBRE_PROMO,
      kind: "portfolio",
      status: "DRAFT",
      operation: "SALE",
      propertyType: "piso",
      constructionStatus: null,
      island: "Tenerife",
      municipality: "Adeje",
      address: "Calle Principal 123",
      mapPrivacyMode: "EXACT",
      seoTitle: null,
      seoDescription: null,
      assignedAgentId: null,
    });
    expect(result.success).toBe(true);
  });

  it("acepta snapshot parcial (solo algunos campos)", () => {
    const result = PromocionDraftSchema.safeParse({
      name: "Residencial",
      kind: "portfolio",
      status: "DRAFT",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza kind inválido en snapshot", () => {
    const result = PromocionDraftSchema.safeParse({
      name: "Test",
      kind: "invalid",
      status: "DRAFT",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza status inválido en snapshot", () => {
    const result = PromocionDraftSchema.safeParse({
      name: "Test",
      kind: "portfolio",
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza name con menos de 3 caracteres", () => {
    const result = PromocionDraftSchema.safeParse({
      name: "AB",
      kind: "portfolio",
      status: "DRAFT",
    });
    expect(result.success).toBe(false);
  });

  it("no exige campos requeridos de PUBLISHED (el draft es un snapshot)", () => {
    // Draft puede estar incompleto — es un snapshot, no una validación de publicación
    const result = PromocionDraftSchema.safeParse({
      name: "Test",
      kind: "portfolio",
      status: "PUBLISHED",
      // Falta operation, propertyType, mapPrivacyMode
    });
    // Draft schema no tiene condicionales de PUBLISHED
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TipologiaSchema
// ---------------------------------------------------------------------------

describe("TipologiaSchema", () => {
  const validTipologia = {
    name: "3 dormitorios planta baja",
    usefulArea: 85,
    builtArea: 100,
    floors: 1,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 2024,
    energyCert: "A" as const,
    referencePriceSale: 250000,
    referencePriceRent: null,
    communityFee: 80,
    deposit: null,
    amenities: ["ascensor", "terraza", "garaje"],
    planAssetId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
  };

  it("acepta tipología válida completa", () => {
    const result = TipologiaSchema.safeParse(validTipologia);
    expect(result.success).toBe(true);
  });

  it("acepta tipología con id opcional", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      id: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza id no UUID", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("acepta tipología con solo name (mínimo)", () => {
    const result = TipologiaSchema.safeParse({ name: "Estudio básico" });
    expect(result.success).toBe(true);
  });

  it("rechaza name vacío", () => {
    const result = TipologiaSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza name con menos de 2 caracteres", () => {
    const result = TipologiaSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("rechaza name con más de 150 caracteres", () => {
    const result = TipologiaSchema.safeParse({ name: "X".repeat(151) });
    expect(result.success).toBe(false);
  });

  it("rechaza amenity inválido", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      amenities: ["piscina_olimpica"],
    });
    expect(result.success).toBe(false);
  });

  it("acepta amenities vacío (array vacío)", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      amenities: [],
    });
    expect(result.success).toBe(true);
  });

  it("usa default [] para amenities cuando no se envía", () => {
    const payload = {
      name: validTipologia.name,
      usefulArea: validTipologia.usefulArea,
      builtArea: validTipologia.builtArea,
      floors: validTipologia.floors,
      bedrooms: validTipologia.bedrooms,
      bathrooms: validTipologia.bathrooms,
      yearBuilt: validTipologia.yearBuilt,
      energyCert: validTipologia.energyCert,
      referencePriceSale: validTipologia.referencePriceSale,
      referencePriceRent: validTipologia.referencePriceRent,
      communityFee: validTipologia.communityFee,
      deposit: validTipologia.deposit,
      planAssetId: validTipologia.planAssetId,
    };
    const result = TipologiaSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amenities).toEqual([]);
    }
  });

  it("rechaza energyCert inválido", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      energyCert: "Z",
    });
    expect(result.success).toBe(false);
  });

  it("acepta energyCert = EN_TRAMITE", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      energyCert: "EN_TRAMITE",
    });
    expect(result.success).toBe(true);
  });

  it("acepta energyCert null", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      energyCert: null,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza usefulArea negativo", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      usefulArea: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza bedrooms mayor a 10", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      bedrooms: 15,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza yearBuilt menor a 1800", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      yearBuilt: 1700,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza yearBuilt mayor a 2100", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      yearBuilt: 2200,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza referencePriceSale negativo", () => {
    const result = TipologiaSchema.safeParse({
      ...validTipologia,
      referencePriceSale: -1000,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UnidadSchema
// ---------------------------------------------------------------------------

describe("UnidadSchema", () => {
  it("acepta unidad con identifier y status", () => {
    const result = UnidadSchema.safeParse({
      identifier: "Puerta 1A",
      status: "AVAILABLE",
    });
    expect(result.success).toBe(true);
  });

  it("acepta unidad con identifier null", () => {
    const result = UnidadSchema.safeParse({
      identifier: null,
      status: "RESERVED",
    });
    expect(result.success).toBe(true);
  });

  it("usa status por defecto = AVAILABLE", () => {
    const result = UnidadSchema.safeParse({
      identifier: "Puerta 2B",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("AVAILABLE");
    }
  });

  it("acepta unidad sin identifier (completamente opcional)", () => {
    const result = UnidadSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("AVAILABLE");
      expect(result.data.identifier).toBeUndefined();
    }
  });

  it("rechaza identifier con más de 50 caracteres", () => {
    const result = UnidadSchema.safeParse({
      identifier: "X".repeat(51),
      status: "AVAILABLE",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza status inválido", () => {
    const result = UnidadSchema.safeParse({
      identifier: "Puerta 1A",
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("acepta todos los status válidos", () => {
    const validStatuses = ["AVAILABLE", "RESERVED", "SOLD", "RENTED"] as const;
    for (const status of validStatuses) {
      const result = UnidadSchema.safeParse({
        identifier: "Test",
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rechaza identifier como número (debe ser string)", () => {
    const result = UnidadSchema.safeParse({
      identifier: 12345,
      status: "AVAILABLE",
    });
    expect(result.success).toBe(false);
  });
});
