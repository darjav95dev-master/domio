import { describe, it, expect } from "vitest";
import { buildStructuredData } from "./get-detail-data";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = new Date("2026-07-08T12:00:00Z");

function createMockDetail(overrides?: Partial<PromocionDetail>): PromocionDetail {
  return {
    id: "promo-1",
    tenantId: "tenant-1",
    slug: "piso-en-venta-en-santa-cruz-3hab-a4c9",
    name: "Residencial Las Américas",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "piso",
    constructionStatus: "ON_PLAN",
    island: "Tenerife",
    municipality: "Santa Cruz",
    address: "Calle Principal 123",
    location: [-16.5, 28.1] as [number, number],
    locationApprox: [-16.5, 28.1] as [number, number],
    mapPrivacyMode: "EXACT",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    assignedAgentName: null,
    draftPayload: null,
    createdAt: NOW,
    updatedAt: NOW,
    tipologias: [
      {
        id: "tipo-1",
        tenantId: "tenant-1",
        promocionId: "promo-1",
        name: "3 dormitorios planta baja",
        usefulArea: 85,
        builtArea: 100,
        floors: 1,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 2024,
        energyCert: "A",
        referencePriceSale: 250000,
        referencePriceRent: null,
        communityFee: 80,
        deposit: null,
        amenities: ["ascensor", "terraza"],
        planAssetId: null,
        createdAt: NOW,
        updatedAt: NOW,
        unidades: [
          {
            id: "unidad-1",
            tenantId: "tenant-1",
            tipologiaId: "tipo-1",
            identifier: "Puerta 1A",
            status: "AVAILABLE",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
    ],
    contentBlocks: [
      {
        id: "block-1",
        tenantId: "tenant-1",
        promocionId: "promo-1",
        blockType: "DESCRIPCION_GENERAL",
        payload: {
          text: "<p>Hermoso piso en el centro de Santa Cruz con vistas al mar.</p>",
        },
        sortOrder: 0,
        updatedBy: null,
        updatedAt: NOW,
      },
      {
        id: "block-2",
        tenantId: "tenant-1",
        promocionId: "promo-1",
        blockType: "UBICACION_SERVICIOS",
        payload: {
          items: [
            { service: "Colegio", distance: "300 m" },
            { service: "Supermercado", distance: "500 m" },
            { service: "Parada de guagua", distance: "150 m" },
          ],
        },
        sortOrder: 1,
        updatedBy: null,
        updatedAt: NOW,
      },
    ],
    mediaAssets: [
      {
        id: "asset-1",
        tenantId: "tenant-1",
        ownerType: "PROMOCION",
        ownerId: "promo-1",
        kind: "IMAGE_GALLERY",
        r2Key: "promo-1/hero.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 2048000,
        altText: "Fachada del edificio",
        sortOrder: 0,
        isCover: true,
        createdAt: NOW,
      },
      {
        id: "asset-2",
        tenantId: "tenant-1",
        ownerType: "PROMOCION",
        ownerId: "promo-1",
        kind: "IMAGE_GALLERY",
        r2Key: "promo-1/interior.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1800000,
        altText: "Salón comedor",
        sortOrder: 1,
        isCover: false,
        createdAt: NOW,
      },
    ],
    ...overrides,
  };
}

describe("buildStructuredData", () => {
  it("returns a valid RealEstateListing JSON-LD object", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result).not.toBeNull();
    expect(result!["@context"]).toBe("https://schema.org");
    expect(result!["@type"]).toBe("RealEstateListing");
    expect(result!.name).toBe(detail.name);
  });

  it("includes the promocion name and description", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.name).toBe("Residencial Las Américas");
    expect(result!.description).toContain("Hermoso piso en el centro");
  });

  it("includes image URLs from media assets of kind IMAGE_GALLERY", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.image).toHaveLength(2);
    expect(result!.image![0]).toContain("promo-1/hero.jpg");
    expect(result!.image![1]).toContain("promo-1/interior.jpg");
  });

  it("includes offer with price from the first tipologia", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.offers).toBeDefined();
    expect(result!.offers!.price).toBe(250000);
    expect(result!.offers!.priceCurrency).toBe("EUR");
  });

  it("includes floor size from the first tipologia", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.floorSize).toBeDefined();
    expect(result!.floorSize!.value).toBe(100);
    expect(result!.floorSize!.unitCode).toBe("MTK");
  });

  it("includes numberOfBedrooms and numberOfBathrooms from aggregate", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.numberOfBedrooms).toBe(3);
    expect(result!.numberOfBathrooms).toBe(2);
  });

  it("includes address from promocion fields", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.address).toBeDefined();
    expect(result!.address!["@type"]).toBe("PostalAddress");
    expect(result!.address!.streetAddress).toBe("Calle Principal 123");
    expect(result!.address!.addressLocality).toBe("Santa Cruz");
    expect(result!.address!.addressRegion).toBe("Tenerife");
    expect(result!.address!.addressCountry).toBe("ES");
  });

  it("includes geo with exact coordinates when mapPrivacyMode is EXACT", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.geo).toBeDefined();
    expect(result!.geo!["@type"]).toBe("GeoCoordinates");
    expect(result!.geo!.latitude).toBeCloseTo(28.1, 10);
    expect(result!.geo!.longitude).toBeCloseTo(-16.5, 10);
  });

  it("DOES NOT include exact geo coordinates when mapPrivacyMode is AREA", () => {
    const detail = createMockDetail({ mapPrivacyMode: "AREA" });
    const result = buildStructuredData(detail);

    expect(result!.geo).toBeUndefined();
  });

  it("includes url with slug-based canonical", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.url).toContain(detail.slug);
  });

  it("sets priceCurrency to EUR for sale operations", () => {
    const detail = createMockDetail({ operation: "SALE" });
    const result = buildStructuredData(detail);

    expect(result!.offers!.priceCurrency).toBe("EUR");
  });

  it("sets priceCurrency to EUR for rent operations", () => {
    const detail = createMockDetail({ operation: "RENT" });
    const result = buildStructuredData(detail);

    expect(result!.offers!.priceCurrency).toBe("EUR");
  });

  it("returns null if promocion status is not PUBLISHED", () => {
    const detail = createMockDetail({ status: "DRAFT" });
    const result = buildStructuredData(detail);

    expect(result).toBeNull();
  });

  it("handles null operation gracefully", () => {
    const detail = createMockDetail({ operation: null });
    const result = buildStructuredData(detail);

    expect(result).not.toBeNull();
    expect(result!.offers!.price).toBe(250000);
  });

  it("includes years of construction in the structured data", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.yearBuilt).toBe(2024);
  });

  it("includes the energy certificate", () => {
    const detail = createMockDetail();
    const result = buildStructuredData(detail);

    expect(result!.energyEfficiency).toBe("A");
  });
});
