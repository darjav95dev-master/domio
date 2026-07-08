import { describe, it, expect } from "vitest";
import { UnidadRepository } from "./unidad.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "./__tests__/test-utils";

const TENANT_ID = "tenant-1";
const TIPOLOGIA_ID = "tipo-1";
const UNIDAD_ID = "unidad-1";
const NOW = new Date("2026-07-08T12:00:00Z");

const baseUnidadRow = {
  id: UNIDAD_ID,
  tenantId: TENANT_ID,
  tipologiaId: TIPOLOGIA_ID,
  identifier: "Puerta 1A",
  status: "AVAILABLE",
  createdAt: NOW,
  updatedAt: NOW,
} as const;

describe("UnidadRepository", () => {
  describe("findByTipologiaId", () => {
    it("returns unidades for the given tipologia", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UnidadRepository(ctx);
      const unidadRows = [
        baseUnidadRow,
        {
          ...baseUnidadRow,
          id: "unidad-2",
          identifier: "Puerta 1B",
        },
      ];
      setupMockTransaction(mockWithTx, [unidadRows]);

      const result = await repo.findByTipologiaId(TIPOLOGIA_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.tipologiaId).toBe(TIPOLOGIA_ID);
      expect(result[1]!.tipologiaId).toBe(TIPOLOGIA_ID);
    });

    it("returns empty array when tipologia has no unidades", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UnidadRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findByTipologiaId(TIPOLOGIA_ID);

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("inserts a new unidad and returns it", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UnidadRepository(ctx);
      const newRow = { ...baseUnidadRow, id: "new-unidad", identifier: "Puerta 2A" };
      setupMockTransaction(mockWithTx, [[newRow]]);

      const result = await repo.create({
        tipologiaId: TIPOLOGIA_ID,
        identifier: "Puerta 2A",
        status: "AVAILABLE",
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe("new-unidad");
      expect(result.identifier).toBe("Puerta 2A");
    });
  });

  describe("update", () => {
    it("updates unidad fields and returns updated row", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UnidadRepository(ctx);
      const updatedRow = {
        ...baseUnidadRow,
        status: "RESERVED" as const,
      };
      setupMockTransaction(mockWithTx, [[updatedRow]]);

      const result = await repo.update(UNIDAD_ID, {
        status: "RESERVED",
      });

      expect(result).not.toBeNull();
      expect(result.status).toBe("RESERVED");
    });
  });

  describe("delete", () => {
    it("removes the unidad and returns it", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UnidadRepository(ctx);
      const deletedRow = { ...baseUnidadRow };
      setupMockTransaction(mockWithTx, [[deletedRow]]);

      const result = await repo.delete(UNIDAD_ID);

      expect(result).not.toBeNull();
      expect(result.id).toBe(UNIDAD_ID);
    });
  });
});
