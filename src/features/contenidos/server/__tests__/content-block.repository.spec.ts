/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import { ContentBlockRepository } from "../content-block.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "./test-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const PAGE_KEY_HOME = "home" as const;
const BLOCK_KEY_HERO = "hero" as const;
const NOW = new Date("2026-07-08T12:00:00Z");

const baseContentBlockRow = {
  id: "block-1",
  tenantId: TENANT_ID,
  pageKey: PAGE_KEY_HOME,
  blockKey: BLOCK_KEY_HERO,
  payload: { claim: "Vive tu hogar ideal", lead: "Descubre promociones únicas" },
  updatedBy: USER_ID,
  updatedAt: NOW,
};

const heroPayload = {
  claim: "Vive tu hogar ideal",
  lead: "Descubre promociones únicas",
  ctaPrimary: "Ver promociones",
  ctaSecondary: "Saber más",
  backgroundImageId: null,
};

// ---------------------------------------------------------------------------
// ContentBlockRepository
// ---------------------------------------------------------------------------
describe("ContentBlockRepository", () => {
  describe("findByTenantAndPage", () => {
    it("returns all content blocks for the given tenant and page", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentBlockRepository(ctx);
      const blocks = [
        { ...baseContentBlockRow, id: "b1", blockKey: "hero" },
        { ...baseContentBlockRow, id: "b2", blockKey: "como-trabajamos" },
      ];
      setupMockTransaction(mockWithTx, [blocks]);

      const result = await repo.findByTenantAndPage(TENANT_ID, PAGE_KEY_HOME);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe("b1");
      expect(result[1]?.id).toBe("b2");
    });

    it("returns empty array when no blocks exist for the page", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentBlockRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findByTenantAndPage(TENANT_ID, PAGE_KEY_HOME);

      expect(result).toEqual([]);
    });
  });

  describe("findByTenantPageAndBlock", () => {
    it("returns the specific block when it exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentBlockRepository(ctx);
      setupMockTransaction(mockWithTx, [[baseContentBlockRow]]);

      const result = await repo.findByTenantPageAndBlock(
        TENANT_ID, PAGE_KEY_HOME, BLOCK_KEY_HERO,
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe("block-1");
      expect(result!.blockKey).toBe("hero");
      expect(result!.tenantId).toBe(TENANT_ID);
    });

    it("returns null when the block does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentBlockRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findByTenantPageAndBlock(
        TENANT_ID, PAGE_KEY_HOME, "nonexistent" as never,
      );

      expect(result).toBeNull();
    });
  });

  describe("upsert", () => {
    it("inserts a new content block when none exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ContentBlockRepository(ctx);

      const createdRow = {
        ...baseContentBlockRow,
        id: "new-block",
        payload: heroPayload,
        updatedBy: USER_ID,
      };
      // First SELECT (finds nothing) → [], then INSERT → [createdRow]
      setupMockTransaction(mockWithTx, [[], [createdRow]]);

      const result = await repo.upsert(
        TENANT_ID, PAGE_KEY_HOME, BLOCK_KEY_HERO, heroPayload, USER_ID,
      );

      expect(result).not.toBeNull();
      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.pageKey).toBe(PAGE_KEY_HOME);
      expect(result.blockKey).toBe(BLOCK_KEY_HERO);
      expect(result.payload).toEqual(heroPayload);
    });

    it("updates an existing content block when it exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ContentBlockRepository(ctx);

      const existingRow = { ...baseContentBlockRow };
      const updatedRow = {
        ...baseContentBlockRow,
        payload: { claim: "Updated claim" },
        updatedBy: USER_ID,
      };
      // First SELECT (finds existing) → [existingRow], then UPDATE → [updatedRow]
      setupMockTransaction(mockWithTx, [[existingRow], [updatedRow]]);

      const result = await repo.upsert(
        TENANT_ID, PAGE_KEY_HOME, BLOCK_KEY_HERO,
        { claim: "Updated claim" }, USER_ID,
      );

      expect(result).not.toBeNull();
      expect(result.payload).toEqual({ claim: "Updated claim" });
    });
  });
});
