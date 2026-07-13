import { describe, it, expect } from "vitest";
import { PromocionDetailRepository } from "./promocion-detail.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "./__tests__/test-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = "tenant-1";
const PROMOCION_ID = "promo-1";
const TIPOLOGIA_ID = "tipo-1";
const UNIDAD_ID = "unidad-1";
const SLUG = "piso-en-venta-en-santa-cruz-3hab-a4c9";
const NOW = new Date("2026-07-08T12:00:00Z");

const basePromocionRow = {
  id: PROMOCION_ID,
  tenantId: TENANT_ID,
  slug: SLUG,
  name: "Residencial Las Américas",
  kind: "portfolio",
  status: "PUBLISHED",
  operation: "SALE",
  propertyType: "piso",
  constructionStatus: "ON_PLAN",
  island: "Tenerife",
  municipality: "Adeje",
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
} as const;

const baseTipologiaRow = {
  id: TIPOLOGIA_ID,
  tenantId: TENANT_ID,
  promocionId: PROMOCION_ID,
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
} as const;

const baseUnidadRow = {
  id: UNIDAD_ID,
  tenantId: TENANT_ID,
  tipologiaId: TIPOLOGIA_ID,
  identifier: "Puerta 1A",
  status: "AVAILABLE",
  createdAt: NOW,
  updatedAt: NOW,
} as const;

const contentBlockRows = [
  {
    id: "block-1",
    tenantId: TENANT_ID,
    promocionId: PROMOCION_ID,
    blockType: "DESCRIPCION_GENERAL",
    payload: { text: "<p>Descripción general</p>" },
    sortOrder: 0,
    updatedBy: null,
    updatedAt: NOW,
  },
  {
    id: "block-2",
    tenantId: TENANT_ID,
    promocionId: PROMOCION_ID,
    blockType: "UBICACION_SERVICIOS",
    payload: {
      items: [{ service: "Colegio", distance: "300 m" }],
    },
    sortOrder: 1,
    updatedBy: null,
    updatedAt: NOW,
  },
];

const mediaAssetRows = [
  {
    id: "asset-1",
    tenantId: TENANT_ID,
    ownerType: "PROMOCION",
    ownerId: PROMOCION_ID,
    kind: "IMAGE_GALLERY",
    r2Key: "promo-1/hero.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 2048000,
    altText: "Fachada del edificio",
    sortOrder: 0,
    isCover: true,
    createdAt: NOW,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PromocionDetailRepository", () => {
  describe("findDetailBySlug", () => {
    it("returns full promocion detail with all relations", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionDetailRepository(ctx);

      // Order: promocion, then Promise.all(tipologias, contentBlocks, mediaAssets), then unidades
      setupMockTransaction(mockWithTx, [
        [basePromocionRow],   // 0: promocion query
        [baseTipologiaRow],   // 1: assembleTipologias → tipologias
        contentBlockRows,     // 2: content blocks (parallel)
        mediaAssetRows,       // 3: media assets (parallel)
        [baseUnidadRow],      // 4: assembleTipologias → unidades (after await)
      ]);

      const result = await repo.findDetailBySlug(SLUG);

      expect(result).not.toBeNull();
      expect(result!.slug).toBe(SLUG);
      expect(result!.status).toBe("PUBLISHED");
      expect(result!.tipologias).toHaveLength(1);
      expect(result!.tipologias[0]!.unidades).toHaveLength(1);
      expect(result!.contentBlocks).toHaveLength(2);
      expect(result!.mediaAssets).toHaveLength(1);
      expect(result!.mediaAssets[0]!.kind).toBe("IMAGE_GALLERY");
    });

    it("returns null when slug does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionDetailRepository(ctx);

      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findDetailBySlug("nonexistent-slug");

      expect(result).toBeNull();
    });

    it("returns empty arrays when no tipologias, blocks or assets exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionDetailRepository(ctx);

      // promocion found, but empty tipologias → no unidades query, then empty blocks, empty assets
      setupMockTransaction(mockWithTx, [
        [basePromocionRow],
        [], // empty tipologias
        [], // empty content blocks
        [], // empty media assets
      ]);

      const result = await repo.findDetailBySlug(SLUG);

      expect(result).not.toBeNull();
      expect(result!.tipologias).toEqual([]);
      expect(result!.contentBlocks).toEqual([]);
      expect(result!.mediaAssets).toEqual([]);
    });
  });
});
