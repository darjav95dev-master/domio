import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromocionPublishService } from "./promocion-publish.service";
import type { PromocionRepository, PromocionWithRelations } from "@/infrastructure/db/repositories/promocion.repository";
import type { PromocionContentBlockRepository } from "@/infrastructure/db/repositories/promocion-content-block.repository";
import type { PromocionUpdatePayload } from "@/shared/schemas/promocion.schema";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/features/promociones/actions/media.actions", () => ({
  validateMediaForPublish: vi.fn(),
}));

import { validateMediaForPublish } from "@/features/promociones/actions/media.actions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROMO_ID = "550e8400-e29b-41d4-a716-446655440000";
const STATUS_PUBLISHED = "PUBLISHED";
const STATUS_DRAFT = "DRAFT";
const DRAFT_NAME = "Draft Name";
const DRAFT_SEO = "Draft SEO";

function makeCurrentPromocion(overrides: Partial<PromocionWithRelations> = {}): PromocionWithRelations {
  return {
    id: PROMO_ID,
    tenantId: "tenant-1",
    slug: null,
    name: "Residencial Test",
    kind: "RESIDENTIAL",
    status: STATUS_DRAFT,
    operation: "SALE",
    propertyType: "APARTMENT",
    constructionStatus: "NEW",
    island: "Gran Canaria",
    municipality: "Las Palmas de Gran Canaria",
    address: "Calle Test 1",
    location: [-15.41, 28.09],
    locationApprox: [-15.41, 28.09],
    mapPrivacyMode: "APPROX",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: "agent-1",
    assignedAgentName: "Agent One",
    draftPayload: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    tipologias: [],
    ...overrides,
  };
}

function makeRepoMock(): PromocionRepository {
  return {} as PromocionRepository;
}

function makeContentBlockRepoMock(): PromocionContentBlockRepository {
  return {
    validateBlocksForPublish: vi.fn(),
  } as unknown as PromocionContentBlockRepository;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PromocionPublishService", () => {
  let service: PromocionPublishService;
  let contentBlockRepo: PromocionContentBlockRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    contentBlockRepo = makeContentBlockRepoMock();
    service = new PromocionPublishService(makeRepoMock(), contentBlockRepo);
  });

  // ── prepareUpdateData ────────────────────────────────────────────────

  describe("prepareUpdateData", () => {
    it("generates slug when publishing for the first time (no existing slug)", () => {
      const parsedData = { status: STATUS_PUBLISHED } as PromocionUpdatePayload;
      const current = makeCurrentPromocion({ slug: null });

      const { data, resultingSlug } = service.prepareUpdateData(
        parsedData,
        current,
        PROMO_ID,
        true,
      );

      expect(data.slug).toBeDefined();
      expect(typeof data.slug).toBe("string");
      expect((data.slug as string).length).toBeGreaterThan(0);
      // resultingSlug must match the generated slug
      expect(resultingSlug).toBe(data.slug);
    });

    it("does not generate a new slug when promocion already has one", () => {
      const parsedData = { status: STATUS_PUBLISHED } as PromocionUpdatePayload;
      const current = makeCurrentPromocion({ slug: "existing-slug-abcd" });

      const { data, resultingSlug } = service.prepareUpdateData(
        parsedData,
        current,
        PROMO_ID,
        true,
      );

      expect(data.slug).toBeUndefined();
      expect(resultingSlug).toBe("existing-slug-abcd");
    });

    it("does not generate a slug when not publishing", () => {
      const parsedData = { name: "Updated Name" } as PromocionUpdatePayload;
      const current = makeCurrentPromocion({ slug: null });

      const { data, resultingSlug } = service.prepareUpdateData(
        parsedData,
        current,
        PROMO_ID,
        false,
      );

      expect(data.slug).toBeUndefined();
      expect(resultingSlug).toBeNull();
    });

    it("merges draftPayload fields when publishing from draft", () => {
      const parsedData = { status: STATUS_PUBLISHED } as PromocionUpdatePayload;
      const current = makeCurrentPromocion({
        slug: "already-slug-abcd",
        draftPayload: { name: DRAFT_NAME, seoTitle: DRAFT_SEO },
      });

      const { data } = service.prepareUpdateData(
        parsedData,
        current,
        PROMO_ID,
        true,
      );

      // Fields from draftPayload that are not in parsedData should be merged
      expect(data.name).toBe(DRAFT_NAME);
      expect(data.seoTitle).toBe(DRAFT_SEO);
      // draftPayload itself should be cleared
      expect(data.draftPayload).toBeNull();
    });

    it("parsedData fields take precedence over draftPayload fields", () => {
      const parsedData = { status: STATUS_PUBLISHED, name: "Explicit Name" } as PromocionUpdatePayload;
      const current = makeCurrentPromocion({
        slug: "already-slug-abcd",
        draftPayload: { name: DRAFT_NAME },
      });

      const { data } = service.prepareUpdateData(
        parsedData,
        current,
        PROMO_ID,
        true,
      );

      expect(data.name).toBe("Explicit Name");
    });

    it("does not merge draftPayload when not publishing", () => {
      const parsedData = { name: "Updated Name" } as PromocionUpdatePayload;
      const current = makeCurrentPromocion({
        draftPayload: { seoTitle: DRAFT_SEO },
      });

      const { data } = service.prepareUpdateData(
        parsedData,
        current,
        PROMO_ID,
        false,
      );

      expect(data.seoTitle).toBeUndefined();
      expect(data.draftPayload).toBeUndefined();
    });

    it("includes bedrooms from first tipologia in generated slug", () => {
      const parsedData = { status: STATUS_PUBLISHED } as PromocionUpdatePayload;
      const current = makeCurrentPromocion({
        slug: null,
        tipologias: [
          {
            id: "tipo-1",
            tenantId: "tenant-1",
            promocionId: PROMO_ID,
            name: "Tipo A",
            bedrooms: 3,
            bathrooms: 2,
            usefulArea: 90,
            builtArea: 100,
            floors: 2,
            yearBuilt: null,
            energyCert: null,
            referencePriceSale: null,
            referencePriceRent: null,
            communityFee: null,
            deposit: null,
            amenities: [],
            planAssetId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            unidades: [],
          },
        ],
      });

      const { data } = service.prepareUpdateData(
        parsedData,
        current,
        PROMO_ID,
        true,
      );

      // Slug should mention "3hab" for 3 bedrooms
      expect(data.slug as string).toContain("3hab");
    });
  });

  // ── convertLocationFields ────────────────────────────────────────────

  describe("convertLocationFields", () => {
    it("converts location object { lng, lat } to [lng, lat] tuple", () => {
      const data: Record<string, unknown> = {
        location: { lng: -15.41, lat: 28.09 },
      };

      service.convertLocationFields(data);

      expect(data.location).toEqual([-15.41, 28.09]);
    });

    it("converts locationApprox object to tuple", () => {
      const data: Record<string, unknown> = {
        locationApprox: { lng: -15.5, lat: 28.1 },
      };

      service.convertLocationFields(data);

      expect(data.locationApprox).toEqual([-15.5, 28.1]);
    });

    it("converts null location to null", () => {
      const data: Record<string, unknown> = { location: null };

      service.convertLocationFields(data);

      expect(data.location).toBeNull();
    });

    it("does not touch fields that are absent", () => {
      const data: Record<string, unknown> = { name: "Test" };

      service.convertLocationFields(data);

      expect(data.location).toBeUndefined();
      expect(data.locationApprox).toBeUndefined();
    });

    it("converts both location fields when both are present", () => {
      const data: Record<string, unknown> = {
        location: { lng: -15.41, lat: 28.09 },
        locationApprox: { lng: -15.5, lat: 28.1 },
      };

      service.convertLocationFields(data);

      expect(data.location).toEqual([-15.41, 28.09]);
      expect(data.locationApprox).toEqual([-15.5, 28.1]);
    });
  });

  // ── validateBlocksOnPublish ──────────────────────────────────────────

  describe("validateBlocksOnPublish", () => {
    it("returns null when not publishing (skips validation)", async () => {
      const result = await service.validateBlocksOnPublish(PROMO_ID, false);

      expect(result).toBeNull();
      expect(contentBlockRepo.validateBlocksForPublish).not.toHaveBeenCalled();
    });

    it("returns null when all blocks are valid", async () => {
      vi.mocked(contentBlockRepo.validateBlocksForPublish).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await service.validateBlocksOnPublish(PROMO_ID, true);

      expect(result).toBeNull();
    });

    it("returns block errors when validation fails", async () => {
      vi.mocked(contentBlockRepo.validateBlocksForPublish).mockResolvedValue({
        valid: false,
        errors: [
          {
            blockId: "block-1",
            blockType: "DESCRIPCION",
            issues: ["content: Required"],
          },
        ],
      });

      const result = await service.validateBlocksOnPublish(PROMO_ID, true);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]!.blockId).toBe("block-1");
      expect(result![0]!.blockType).toBe("DESCRIPCION");
      expect(result![0]!.issues).toEqual(["content: Required"]);
    });

    it("calls validateBlocksForPublish with correct promocionId", async () => {
      vi.mocked(contentBlockRepo.validateBlocksForPublish).mockResolvedValue({
        valid: true,
        errors: [],
      });

      await service.validateBlocksOnPublish(PROMO_ID, true);

      expect(contentBlockRepo.validateBlocksForPublish).toHaveBeenCalledWith(PROMO_ID);
    });
  });

  // ── validateMediaOnPublish ───────────────────────────────────────────

  describe("validateMediaOnPublish", () => {
    it("returns null when not publishing (skips validation)", async () => {
      const result = await service.validateMediaOnPublish(PROMO_ID, false);

      expect(result).toBeNull();
      expect(validateMediaForPublish).not.toHaveBeenCalled();
    });

    it("returns null when media is valid", async () => {
      vi.mocked(validateMediaForPublish).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await service.validateMediaOnPublish(PROMO_ID, true);

      expect(result).toBeNull();
    });

    it("returns media errors when validation fails", async () => {
      vi.mocked(validateMediaForPublish).mockResolvedValue({
        valid: false,
        errors: ["Se requiere al menos una imagen en la galería"],
      });

      const result = await service.validateMediaOnPublish(PROMO_ID, true);

      expect(result).not.toBeNull();
      expect(result).toEqual(["Se requiere al menos una imagen en la galería"]);
    });

    it("calls validateMediaForPublish with correct promocionId", async () => {
      vi.mocked(validateMediaForPublish).mockResolvedValue({
        valid: true,
        errors: [],
      });

      await service.validateMediaOnPublish(PROMO_ID, true);

      expect(validateMediaForPublish).toHaveBeenCalledWith(PROMO_ID);
    });
  });
});
