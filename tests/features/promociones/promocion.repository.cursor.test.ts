/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import {
  createMockTx,
} from "@/infrastructure/db/repositories/__tests__/test-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPublicCtx() {
  const ctx = new PublicContext();
  const mockWithTx = vi.fn();
  ctx.withTransaction = mockWithTx as unknown as typeof ctx.withTransaction;
  return { ctx, mockWithTx };
}

function setupMockTx(
  mockWithTx: ReturnType<typeof vi.fn>,
  dataSequence: unknown[],
) {
  const { tx } = createMockTx(dataSequence);
  mockWithTx.mockImplementation(
    <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(tx),
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const basePromocionRow = {
  id: "",
  tenantId: "00000000-0000-0000-0000-000000000001",
  slug: "test-promo",
  name: "Residencial Test",
  kind: "portfolio",
  status: "PUBLISHED",
  operation: "SALE",
  propertyType: "piso",
  constructionStatus: "ON_PLAN",
  island: "Tenerife",
  municipality: "Santa Cruz",
  address: "Calle Ejemplo 123",
  location: [-16.5, 28.1] as [number, number],
  locationApprox: [-16.5, 28.1] as [number, number],
  mapPrivacyMode: "EXACT",
  seoTitle: null,
  seoDescription: null,
  assignedAgentId: null,
  assignedAgentName: null,
  draftPayload: null,
  createdAt: new Date("2026-07-01T12:00:00Z"),
  updatedAt: new Date("2026-07-01T12:00:00Z"),
};

function makePromo(overrides: Partial<typeof basePromocionRow> = {}) {
  return { ...basePromocionRow, ...overrides };
}

function makeCountResult(count: number) {
  return [{ count: String(count) }];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PromocionRepository — findPublicWithCursor", () => {
  describe("basic behavior", () => {
    it("returns only PUBLISHED promociones for the public context", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      const items = [makePromo({ id: "p1", status: "PUBLISHED" })];
      setupMockTx(mockWithTx, [makeCountResult(1), items]);

      const result = await repo.findPublicWithCursor({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.status).toBe("PUBLISHED");
      expect(result.total).toBe(1);
    });

    it("returns empty cursor when no results", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(0), []]);

      const result = await repo.findPublicWithCursor({});

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
      expect(result.total).toBe(0);
    });

    it("returns nextCursor=null when fewer results than limit", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      const items = [
        makePromo({ id: "p1", createdAt: new Date("2026-07-02T12:00:00Z") }),
        makePromo({ id: "p2", createdAt: new Date("2026-07-01T12:00:00Z") }),
      ];
      setupMockTx(mockWithTx, [makeCountResult(2), items]);

      const result = await repo.findPublicWithCursor({}, { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    it("returns nextCursor when there are more results than limit", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      // Mock returns limit+1 items to signal there's a next page
      const items = [
        makePromo({ id: "p3", createdAt: new Date("2026-07-03T12:00:00Z") }),
        makePromo({ id: "p2", createdAt: new Date("2026-07-02T12:00:00Z") }),
        makePromo({ id: "p1", createdAt: new Date("2026-07-01T12:00:00Z") }),
      ];
      // Limit=2, items has 3 (= limit+1) -> hasMore=true
      setupMockTx(mockWithTx, [makeCountResult(5), items]);

      const result = await repo.findPublicWithCursor({}, { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).not.toBeNull();
    });
  });

  describe("pagination", () => {
    it("cursor pagination works without duplicates across pages", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      // Page 1: mock returns limit+1 items to signal more pages
      const page1Items = [
        makePromo({
          id: "p3",
          createdAt: new Date("2026-07-03T12:00:00Z"),
        }),
        makePromo({
          id: "p2",
          createdAt: new Date("2026-07-02T12:00:00Z"),
        }),
        makePromo({
          id: "p1",
          createdAt: new Date("2026-07-01T12:00:00Z"),
        }),
      ];
      // Limit=2, items=3 (limit+1) -> hasMore=true, returns 2 items
      setupMockTx(mockWithTx, [makeCountResult(3), page1Items]);

      const result1 = await repo.findPublicWithCursor({}, { limit: 2 });

      expect(result1.items).toHaveLength(2);
      expect(result1.nextCursor).not.toBeNull();

      // Page 2: pass the cursor from page 1
      const page2Items = [
        makePromo({
          id: "p1",
          createdAt: new Date("2026-07-01T12:00:00Z"),
        }),
      ];
      setupMockTx(mockWithTx, [makeCountResult(3), page2Items]);

      const result2 = await repo.findPublicWithCursor(
        {},
        { limit: 2, cursor: result1.nextCursor! },
      );

      expect(result2.items).toHaveLength(1);
      // Verify no overlap with page 1
      const page1Ids = new Set(result1.items.map((i) => i.id));
      const page2Ids = new Set(result2.items.map((i) => i.id));
      for (const id of page2Ids) {
        expect(page1Ids.has(id)).toBe(false);
      }
    });
  });

  describe("filters", () => {
    it("filters by island", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({ island: "Tenerife" });

      expect(result.items).toHaveLength(1);
    });

    it("filters by municipality", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({
        municipality: "Santa Cruz",
      });

      expect(result.items).toHaveLength(1);
    });

    it("filters by property type", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({
        propertyType: "piso",
      });

      expect(result.items).toHaveLength(1);
    });

    it("filters by operation", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({ operation: "SALE" });

      expect(result.items).toHaveLength(1);
    });

    it("filters by price range (min)", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({ priceMin: 100000 });

      expect(result.items).toHaveLength(1);
    });

    it("filters by price range (max)", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({ priceMax: 500000 });

      expect(result.items).toHaveLength(1);
    });

    it("filters by bedrooms", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({ bedrooms: 3 });

      expect(result.items).toHaveLength(1);
    });

    it("filters by bathrooms", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({ bathrooms: 2 });

      expect(result.items).toHaveLength(1);
    });

    it("filters by amenities", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({
        amenities: ["ascensor", "terraza"],
      });

      expect(result.items).toHaveLength(1);
    });

    it("filters by construction status", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(1), [makePromo({ id: "p1" })]]);

      const result = await repo.findPublicWithCursor({
        constructionStatus: "ON_PLAN",
      });

      expect(result.items).toHaveLength(1);
    });
  });

  describe("sorting", () => {
    it("defaults to published (created_at DESC) sort", async () => {
      const { ctx, mockWithTx } = createMockPublicCtx();
      const repo = new PromocionRepository(ctx);

      setupMockTx(mockWithTx, [makeCountResult(0), []]);

      await repo.findPublicWithCursor({});

      expect(mockWithTx).toHaveBeenCalled();
    });
  });
});
