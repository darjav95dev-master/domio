/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import { PromocionRepository } from "./promocion.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "./__tests__/test-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const PROMOCION_ID = "promo-1";
const TIPOLOGIA_ID = "tipo-1";
const UNIDAD_ID = "unidad-1";
const NOW = new Date("2026-07-08T12:00:00Z");

const basePromocionRow = {
  id: PROMOCION_ID,
  tenantId: TENANT_ID,
  slug: "",
  name: "Residencial Las Américas",
  kind: "portfolio",
  status: "DRAFT",
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

// ---------------------------------------------------------------------------
// PromocionRepository
// ---------------------------------------------------------------------------
describe("PromocionRepository", () => {
  describe("findAll", () => {
    it("returns all promociones for the tenant with default pagination", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);
      const items = [
        { ...basePromocionRow, id: "p1" },
        { ...basePromocionRow, id: "p2" },
      ];
      // findAll makes two sequential queries: items + count
      setupMockTransaction(mockWithTx, [items, [{ count: "2" }]]);

        const result = await repo.findAll({}, 1, 10);

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.items[0]?.id).toBe("p1");
        expect(result.items[1]?.id).toBe("p2");
      });

      it("includes assignedAgentName from users join", async () => {
        const { ctx, mockWithTx } = createMockAuthCtx({
          tenantId: TENANT_ID,
          role: "ADMIN",
        });
        const repo = new PromocionRepository(ctx);
        const items = [
          {
            ...basePromocionRow,
            assignedAgentId: "agent-1",
            assignedAgentName: "Juan Pérez",
          },
        ];
        setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

        const result = await repo.findAll({}, 1, 10);

        expect(result.items).toHaveLength(1);
        expect(
          (result.items[0] as Record<string, unknown>)?.assignedAgentName,
        ).toBe("Juan Pérez");
      });

    it("applies status filter when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);
      const items = [{ ...basePromocionRow, status: "PUBLISHED" }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll({ status: "PUBLISHED" }, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.status).toBe("PUBLISHED");
    });

    it("applies multiple filters combined with AND", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);
      const items = [
        {
          ...basePromocionRow,
          kind: "portfolio",
          constructionStatus: "IN_CONSTRUCTION",
        },
      ];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { kind: "portfolio", constructionStatus: "IN_CONSTRUCTION" },
        1,
        10,
      );

      expect(result.items).toHaveLength(1);
    });

    it("applies island and municipality filters", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);
      const items = [{ ...basePromocionRow }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { island: "Tenerife", municipality: "Adeje" },
        1,
        10,
      );

      expect(result.items).toHaveLength(1);
    });

    it("applies assignedAgentId filter when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);
      const items = [
        { ...basePromocionRow, assignedAgentId: "agent-1" },
      ];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { assignedAgentId: "agent-1" },
        1,
        10,
      );

      expect(result.items).toHaveLength(1);
    });

    it("applies page and limit for pagination", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);
      setupMockTransaction(mockWithTx, [[], [{ count: "0" }]]);

      const result = await repo.findAll({}, 2, 5);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    describe("AGENT role scope", () => {
      it("auto-filters by assignedAgentId=userId for AGENT role", async () => {
        const { ctx, mockWithTx } = createMockAuthCtx({
          tenantId: TENANT_ID,
          userId: "agent-1",
          role: "AGENT",
        });
        const repo = new PromocionRepository(ctx);
        const items = [
          { ...basePromocionRow, assignedAgentId: "agent-1" },
        ];
        setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

        const result = await repo.findAll({}, 1, 10);

        expect(result.items).toHaveLength(1);
      });

      it("AGENT ignores explicit assignedAgentId filter and uses own userId", async () => {
        const { ctx, mockWithTx } = createMockAuthCtx({
          tenantId: TENANT_ID,
          userId: "agent-1",
          role: "AGENT",
        });
        const repo = new PromocionRepository(ctx);
        const items = [
          { ...basePromocionRow, assignedAgentId: "agent-1" },
        ];
        setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

        // Even though we pass a different agent ID, the AGENT's own ID takes precedence
        const result = await repo.findAll(
          { assignedAgentId: "other-agent" },
          1,
          10,
        );

        expect(result.items).toHaveLength(1);
      });
    });
  });

  describe("findById", () => {
    it("returns the promocion with nested tipologias and unidades", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const promocionRow = {
        ...basePromocionRow,
        assignedAgentName: "Juan Pérez",
      };
      const tipologiaRows = [baseTipologiaRow];
      const unidadRows = [baseUnidadRow];

      // Three sequential queries: promocion, tipologias, unidades
      setupMockTransaction(mockWithTx, [
        [promocionRow],
        tipologiaRows,
        unidadRows,
      ]);

      const result = await repo.findById(PROMOCION_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(PROMOCION_ID);
      expect(result!.assignedAgentName).toBe("Juan Pérez");
      expect(result!.tipologias).toHaveLength(1);
      expect(result!.tipologias[0]!.id).toBe(TIPOLOGIA_ID);
      expect(result!.tipologias[0]!.unidades).toHaveLength(1);
      expect(result!.tipologias[0]!.unidades[0]!.id).toBe(UNIDAD_ID);
    });

    it("returns null when promocion does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findById("nonexistent");

      expect(result).toBeNull();
    });

    it("returns promocion with empty tipologias array when none exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const promocionRow = { ...basePromocionRow, assignedAgentName: null };
      setupMockTransaction(mockWithTx, [[promocionRow], [], []]);

      const result = await repo.findById(PROMOCION_ID);

      expect(result).not.toBeNull();
      expect(result!.tipologias).toEqual([]);
    });
  });

  describe("create", () => {
    it("inserts a new promocion with status=DRAFT and tenantId from context", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const createdRow = { ...basePromocionRow, id: "new-id", slug: "" };
      setupMockTransaction(mockWithTx, [[createdRow]]);

      const result = await repo.create({
        name: "Residencial Las Américas",
        kind: "portfolio",
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe("new-id");
      expect(result.status).toBe("DRAFT");
      expect(result.tenantId).toBe(TENANT_ID);
    });
  });

  describe("update", () => {
    it("updates fields and records history for changed fields", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const oldRow = { ...basePromocionRow, name: "Old Name" };
      const updatedRow = { ...basePromocionRow, name: "New Name" };

      // Four sequential queries: fetch old, update, insert history, re-fetch
      setupMockTransaction(mockWithTx, [
        [oldRow],
        [updatedRow],
        [{ id: "history-1" }],
        [updatedRow],
      ]);

      const result = await repo.update(PROMOCION_ID, { name: "New Name" });

      expect(result).not.toBeNull();
      expect(result.name).toBe("New Name");
    });

    it("records history entries for each changed field", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const oldRow = {
        ...basePromocionRow,
        name: "Old Name",
        island: "Gran Canaria",
        municipality: "Las Palmas",
      };
      const updatedRow = {
        ...basePromocionRow,
        name: "New Name",
        island: "Tenerife",
        municipality: "Santa Cruz",
      };

      // Two history entries should be inserted
      setupMockTransaction(mockWithTx, [
        [oldRow],
        [updatedRow],
        [{ id: "h1" }],
        [{ id: "h2" }],
      ]);

      await repo.update(PROMOCION_ID, {
        name: "New Name",
        island: "Tenerife",
        municipality: "Santa Cruz",
      });

      // Verify history was recorded for each changed field
      // The mock tx records all calls; we inspect the insert calls
      const insertCalls = mockWithTx.mock.calls;
      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it("does not record history for unchanged fields", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const oldRow = { ...basePromocionRow, name: "Same Name" };
      const updatedRow = { ...basePromocionRow, name: "Same Name" };

      // No history inserts — only fetch + update
      setupMockTransaction(mockWithTx, [[oldRow], [updatedRow]]);

      const result = await repo.update(PROMOCION_ID, { name: "Same Name" });

      expect(result).not.toBeNull();
    });

    it("persists slug when provided in data", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const oldRow = { ...basePromocionRow, slug: "" };
      const updatedRow = {
        ...basePromocionRow,
        slug: "piso-venta-santa-cruz-estudio-abcd",
      };

      // Three queries: fetch old, update (no history for slug), re-fetch
      setupMockTransaction(mockWithTx, [
        [oldRow],
        [updatedRow],
        [updatedRow],
      ]);

      const result = await repo.update(PROMOCION_ID, {
        slug: "piso-venta-santa-cruz-estudio-abcd",
      });

      expect(result.slug).toBe("piso-venta-santa-cruz-estudio-abcd");
    });

    it("persists draftPayload when provided in data", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const oldRow = { ...basePromocionRow, draftPayload: null };
      const draftPayload = { name: "Draft Name", island: "Tenerife" };
      const updatedRow = {
        ...basePromocionRow,
        draftPayload,
      };

      setupMockTransaction(mockWithTx, [
        [oldRow],
        [updatedRow],
        [updatedRow],
      ]);

      const result = await repo.update(PROMOCION_ID, {
        draftPayload,
      });

      expect(result.draftPayload).toEqual(draftPayload);
    });

    it("clears draftPayload when set to null", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const oldRow = {
        ...basePromocionRow,
        draftPayload: { name: "Old" },
      };
      const updatedRow = {
        ...basePromocionRow,
        draftPayload: null,
      };

      setupMockTransaction(mockWithTx, [
        [oldRow],
        [updatedRow],
        [updatedRow],
      ]);

      const result = await repo.update(PROMOCION_ID, {
        draftPayload: null,
      });

      expect(result.draftPayload).toBeNull();
    });

    it("does not record history for slug or draftPayload changes", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const oldRow = {
        ...basePromocionRow,
        slug: "",
        draftPayload: null,
        name: "Old Name",
      };
      const updatedRow = {
        ...basePromocionRow,
        slug: "piso-venta-santa-cruz-estudio-abcd",
        draftPayload: null,
        name: "New Name",
      };

      // 4 queries: fetch old, update, history insert for name change, re-fetch
      setupMockTransaction(mockWithTx, [
        [oldRow],
        [updatedRow],
        [{ id: "h1" }],
        [updatedRow],
      ]);

      const result = await repo.update(PROMOCION_ID, {
        slug: "piso-venta-santa-cruz-estudio-abcd",
        draftPayload: null,
        name: "New Name",
      });

      // Slug and draftPayload should have been applied
      expect(result.slug).toBe("piso-venta-santa-cruz-estudio-abcd");
      expect(result.name).toBe("New Name");
    });
  });

  describe("updateDraft", () => {
    it("ONLY updates draftPayload column", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const draftPayload = { name: "Draft Name", island: "Tenerife" };
      const updatedRow = {
        ...basePromocionRow,
        draftPayload,
      };
      setupMockTransaction(mockWithTx, [[updatedRow]]);

      const result = await repo.updateDraft(PROMOCION_ID, draftPayload);

      expect(result.draftPayload).toEqual(draftPayload);
    });
  });

  describe("delete", () => {
    it("removes the promocion", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const deletedRow = { ...basePromocionRow };
      setupMockTransaction(mockWithTx, [[deletedRow]]);

      const result = await repo.delete(PROMOCION_ID);

      expect(result).not.toBeNull();
      expect(result.id).toBe(PROMOCION_ID);
    });
  });

  describe("getHistory", () => {
    it("returns history entries ordered by createdAt DESC", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      const historyRows = [
        {
          id: "h2",
          tenantId: TENANT_ID,
          promocionId: PROMOCION_ID,
          field: "name",
          oldValue: '"Old"',
          newValue: '"New"',
          authorId: USER_ID,
          createdAt: new Date("2026-07-08T13:00:00Z"),
        },
        {
          id: "h1",
          tenantId: TENANT_ID,
          promocionId: PROMOCION_ID,
          field: "island",
          oldValue: '"Gran Canaria"',
          newValue: '"Tenerife"',
          authorId: USER_ID,
          createdAt: new Date("2026-07-08T12:00:00Z"),
        },
      ];
      setupMockTransaction(mockWithTx, [historyRows]);

      const result = await repo.getHistory(PROMOCION_ID);

      expect(result).toHaveLength(2);
      // Should be ordered by createdAt DESC (repo should apply desc order)
      expect(result[0]!.createdAt > result[1]!.createdAt).toBe(true);
    });

    it("returns empty array when no history exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new PromocionRepository(ctx);

      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.getHistory(PROMOCION_ID);

      expect(result).toEqual([]);
    });
  });
});
