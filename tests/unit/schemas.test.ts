import { describe, it, expect } from "vitest";
import { promocionSchema } from "@/shared/types/promocion-schema";
import { tipologiaSchema } from "@/shared/types/tipologia-schema";
import { leadSchema } from "@/shared/types/lead-schema";
import { contentBlockSchema } from "@/shared/types/content-block-schema";

// ---------------------------------------------------------------------------
// Promocion schema
// ---------------------------------------------------------------------------

describe("promocionSchema", () => {
  const validPayload = {
    name: "Residencial Las Américas",
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "piso" as const,
    constructionStatus: "ON_PLAN" as const,
    island: "Tenerife",
    municipality: "Adeje",
    address: "Calle Ejemplo 123",
    mapPrivacyMode: "EXACT" as const,
    seoTitle: "Residencial Las Américas | Domio",
    seoDescription: "Magnífico residencial en Adeje",
  };

  it("acepta payload válido de promoción", () => {
    const result = promocionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rechaza promoción con kind inválido", () => {
    const result = promocionSchema.safeParse({
      ...validPayload,
      kind: "invalid_kind",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza promoción con status inválido", () => {
    const result = promocionSchema.safeParse({
      ...validPayload,
      status: "INVALID_STATUS",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza name vacío", () => {
    const result = promocionSchema.safeParse({
      ...validPayload,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza mapPrivacyMode inválido", () => {
    const result = promocionSchema.safeParse({
      ...validPayload,
      mapPrivacyMode: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tipologia schema
// ---------------------------------------------------------------------------

describe("tipologiaSchema", () => {
  const validPayload = {
    name: "3 dormitorios planta baja",
    usefulArea: 85,
    builtArea: 100,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["ascensor", "terraza", "garaje"],
    energyCert: "A" as const,
    referencePriceSale: 250000,
    referencePriceRent: null,
  };

  it("acepta payload válido de tipología", () => {
    const result = tipologiaSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rechaza tipología con name vacío", () => {
    const result = tipologiaSchema.safeParse({
      ...validPayload,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza tipología con amenity inválido", () => {
    const result = tipologiaSchema.safeParse({
      ...validPayload,
      amenities: ["invalid_amenity"],
    });
    expect(result.success).toBe(false);
  });

  it("usa default [] para amenities cuando no se envía", () => {
    const result = tipologiaSchema.safeParse({
      name: validPayload.name,
      usefulArea: validPayload.usefulArea,
      builtArea: validPayload.builtArea,
      bedrooms: validPayload.bedrooms,
      bathrooms: validPayload.bathrooms,
      energyCert: validPayload.energyCert,
      referencePriceSale: validPayload.referencePriceSale,
      referencePriceRent: validPayload.referencePriceRent,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amenities).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// Lead schema
// ---------------------------------------------------------------------------

describe("leadSchema", () => {
  const validPayload = {
    name: "Juan López",
    email: "juan@example.com",
    phone: "+34 600 000 000",
    message: "Me interesa esta propiedad",
    source: "commercial" as const,
    channel: "FORM" as const,
    promocionId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
    tipologiaId: null,
    consent: {
      legalBasis: "RGPD consentimiento explícito",
      textAccepted: "He leído y acepto la política de privacidad",
    },
  };

  it("acepta payload válido de lead", () => {
    const result = leadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rechaza lead sin consentimiento", () => {
    const result = leadSchema.safeParse({
      name: validPayload.name,
      email: validPayload.email,
      phone: validPayload.phone,
      message: validPayload.message,
      source: validPayload.source,
      channel: validPayload.channel,
      promocionId: validPayload.promocionId,
      tipologiaId: validPayload.tipologiaId,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza email inválido", () => {
    const result = leadSchema.safeParse({
      ...validPayload,
      email: "no-es-un-email",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza source inválido", () => {
    const result = leadSchema.safeParse({
      ...validPayload,
      source: "invalid_source",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza promocionId no UUID", () => {
    const result = leadSchema.safeParse({
      ...validPayload,
      promocionId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Content block schema (discriminado)
// ---------------------------------------------------------------------------

describe("contentBlockSchema", () => {
  it("acepta DESCRIPCION_GENERAL con payload correcto", () => {
    const result = contentBlockSchema.safeParse({
      blockType: "DESCRIPCION_GENERAL",
      payload: { text: "Descripción del proyecto en varias líneas" },
    });
    expect(result.success).toBe(true);
  });

  it("acepta MEMORIA_CALIDADES con items", () => {
    const result = contentBlockSchema.safeParse({
      blockType: "MEMORIA_CALIDADES",
      payload: {
        items: [
          { title: "Calidad 1", description: "Descripción", icon: "icon-name" },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("acepta ZONAS_COMUNES con items vacíos (array vacío es válido)", () => {
    const result = contentBlockSchema.safeParse({
      blockType: "ZONAS_COMUNES",
      payload: { items: [] },
    });
    expect(result.success).toBe(true);
  });

  it("rechaza blockType inválido", () => {
    const result = contentBlockSchema.safeParse({
      blockType: "INVALID_TYPE",
      payload: { text: "test" },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza DESCRIPCION_GENERAL sin payload.text", () => {
    const result = contentBlockSchema.safeParse({
      blockType: "DESCRIPCION_GENERAL",
      payload: {},
    });
    expect(result.success).toBe(false);
  });
});
