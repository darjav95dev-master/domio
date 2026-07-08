import { describe, it, expect } from "vitest";
import { ContentHistoryRepository } from "../content-history.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "./test-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const NOW = new Date("2026-07-08T12:00:00Z");
const LATER = new Date("2026-07-08T13:00:00Z");

const baseHistoryRow = {
  id: "hist-1",
  tenantId: TENANT_ID,
  contentType: "block",
  contentKey: "home:hero",
  payloadSnapshot: { claim: "Vive tu hogar ideal", lead: "Descubre promociones" },
  updatedBy: USER_ID,
  createdAt: NOW,
};

const baseHistoryRows = [
  {
    id: "hist-3",
    tenantId: TENANT_ID,
    contentType: "block",
    contentKey: "home:hero",
    payloadSnapshot: { claim: "Tercera versión" },
    updatedBy: USER_ID,
    createdAt: LATER,
  },
  {
    id: "hist-2",
    tenantId: TENANT_ID,
    contentType: "block",
    contentKey: "home:hero",
    payloadSnapshot: { claim: "Segunda versión" },
    updatedBy: USER_ID,
    createdAt: new Date("2026-07-08T12:30:00Z"),
  },
  {
    id: "hist-1",
    tenantId: TENANT_ID,
    contentType: "block",
    contentKey: "home:hero",
    payloadSnapshot: { claim: "Primera versión" },
    updatedBy: USER_ID,
    createdAt: NOW,
  },
];

// ---------------------------------------------------------------------------
// ContentHistoryRepository
// ---------------------------------------------------------------------------
describe("ContentHistoryRepository", () => {
  describe("findByContent", () => {
    it("returns history entries ordered by created_at DESC", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentHistoryRepository(ctx);

      // Mock returns rows already in DESC order (as the DB would)
      const descRows = [...baseHistoryRows].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      setupMockTransaction(mockWithTx, [descRows]);

      const result = await repo.findByContent(
        TENANT_ID, "block", "home:hero",
      );

      expect(result).toHaveLength(3);
      expect(result[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        result[1]!.createdAt.getTime(),
      );
    });

    it("respects the limit parameter", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentHistoryRepository(ctx);

      const descRows = [...baseHistoryRows].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      setupMockTransaction(mockWithTx, [descRows.slice(0, 2)]);

      const result = await repo.findByContent(
        TENANT_ID, "block", "home:hero", 2,
      );

      expect(result).toHaveLength(2);
    });

    it("returns empty array when no history exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentHistoryRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findByContent(
        TENANT_ID, "block", "nonexistent",
      );

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("inserts a new history entry and returns it", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ContentHistoryRepository(ctx);

      const newPayload = { claim: "Nuevo contenido" };
      const createdRow = {
        ...baseHistoryRow,
        id: "new-hist",
        payloadSnapshot: newPayload,
      };
      setupMockTransaction(mockWithTx, [[createdRow]]);

      const result = await repo.create(
        TENANT_ID,
        "block",
        "home:hero",
        newPayload,
        USER_ID,
      );

      expect(result).not.toBeNull();
      expect(result.id).toBe("new-hist");
      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.contentType).toBe("block");
      expect(result.contentKey).toBe("home:hero");
      expect(result.payloadSnapshot).toEqual(newPayload);
    });

    it("supports contact content type", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ContentHistoryRepository(ctx);

      const contactPayload = { phone: "+34 900 123 456", email: "info@domio.es" };
      const contactRow = {
        ...baseHistoryRow,
        id: "hist-contact",
        contentType: "contact",
        contentKey: "global",
        payloadSnapshot: contactPayload,
      };
      setupMockTransaction(mockWithTx, [[contactRow]]);

      const result = await repo.create(
        TENANT_ID,
        "contact",
        "global",
        contactPayload,
        USER_ID,
      );

      expect(result).not.toBeNull();
      expect(result.contentType).toBe("contact");
      expect(result.contentKey).toBe("global");
    });
  });

  describe("findById", () => {
    it("returns the specific history entry when it exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentHistoryRepository(ctx);
      setupMockTransaction(mockWithTx, [[baseHistoryRow]]);

      const result = await repo.findById(TENANT_ID, "hist-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("hist-1");
      expect(result!.tenantId).toBe(TENANT_ID);
      expect(result!.contentKey).toBe("home:hero");
    });

    it("returns null when the entry does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContentHistoryRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findById(TENANT_ID, "nonexistent");

      expect(result).toBeNull();
    });
  });
});
