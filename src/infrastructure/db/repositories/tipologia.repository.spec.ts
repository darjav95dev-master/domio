import { describe, it, expect } from "vitest";
import { TipologiaRepository } from "./tipologia.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "./__tests__/test-utils";

const TENANT_ID = "tenant-1";
const PROMOCION_ID = "promo-1";
const TIPOLOGIA_ID = "tipo-1";
const NOW = new Date("2026-07-08T12:00:00Z");

const NOME_TIPOLOGIA = "New tipologia";
const NAME_UPDATED = "Updated name";

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

describe("TipologiaRepository", () => {
  describe("findByPromocionId", () => {
    it("returns tipologias for the given promocion", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new TipologiaRepository(ctx);
      const tipologiaRows = [
        baseTipologiaRow,
        { ...baseTipologiaRow, id: "tipo-2", name: "2 dormitorios ático" },
      ];
      setupMockTransaction(mockWithTx, [tipologiaRows]);

      const result = await repo.findByPromocionId(PROMOCION_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.promocionId).toBe(PROMOCION_ID);
      expect(result[1]!.promocionId).toBe(PROMOCION_ID);
    });

    it("returns empty array when promocion has no tipologias", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new TipologiaRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findByPromocionId(PROMOCION_ID);

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("inserts a new tipologia and returns it", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new TipologiaRepository(ctx);
      const newRow = { ...baseTipologiaRow, id: "new-tipo", name: NOME_TIPOLOGIA };
      setupMockTransaction(mockWithTx, [[newRow]]);

      const result = await repo.create({
        promocionId: PROMOCION_ID,
        name: NOME_TIPOLOGIA,
        usefulArea: 70,
        bedrooms: 2,
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe("new-tipo");
      expect(result.name).toBe(NOME_TIPOLOGIA);
    });
  });

  describe("update", () => {
    it("updates tipologia fields and returns updated row", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new TipologiaRepository(ctx);
      const updatedRow = { ...baseTipologiaRow, name: NAME_UPDATED };
      setupMockTransaction(mockWithTx, [[updatedRow]]);

      const result = await repo.update(TIPOLOGIA_ID, {
        name: NAME_UPDATED,
      });

      expect(result).not.toBeNull();
      expect(result.name).toBe(NAME_UPDATED);
    });
  });

  describe("delete", () => {
    it("removes the tipologia and returns it", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new TipologiaRepository(ctx);
      const deletedRow = { ...baseTipologiaRow };
      setupMockTransaction(mockWithTx, [[deletedRow]]);

      const result = await repo.delete(TIPOLOGIA_ID);

      expect(result).not.toBeNull();
      expect(result.id).toBe(TIPOLOGIA_ID);
    });
  });
});
