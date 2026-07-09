/* eslint-disable sonarjs/no-hardcoded-ip */

import { describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import { arsopRequests } from "@/infrastructure/db/schema";
import { ArsopRepository } from "@/infrastructure/db/repositories/arsop.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "@/infrastructure/db/repositories/__tests__/test-utils";
import type { MediaAsset } from "@/infrastructure/db/schema/media-assets";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const ADMIN_ID = "admin-1";
const LEAD_ID = "lead-1";
const PROMOCION_ID = "promo-1";
const TEST_IP = "192.168.1.1";
const NOW = new Date("2026-07-08T12:00:00Z");

const baseLeadRow = {
  id: LEAD_ID,
  tenantId: TENANT_ID,
  promocionId: PROMOCION_ID,
  tipologiaId: null,
  source: "commercial",
  channel: "FORM",
  name: "Juan Perez",
  email: "juan@example.com",
  phone: "+34600123456",
  message: "Quiero información",
  status: "NEW",
  assignedAgentId: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const baseConsentRow = {
  id: "consent-1",
  tenantId: TENANT_ID,
  leadId: LEAD_ID,
  legalBasis: "RGPD consent",
  textAccepted: "Texto aceptado",
  ip: TEST_IP,
  userAgent: "Mozilla/5.0",
  createdAt: NOW,
};

const baseNoteRow = {
  id: "note-1",
  tenantId: TENANT_ID,
  leadId: LEAD_ID,
  authorId: USER_ID,
  body: "Nota de prueba",
  createdAt: NOW,
};

const baseHistoryRow = {
  id: "history-1",
  tenantId: TENANT_ID,
  leadId: LEAD_ID,
  fromStatus: null,
  toStatus: "NEW",
  authorId: USER_ID,
  createdAt: NOW,
};

const mockMediaAsset: MediaAsset = {
  id: "asset-1",
  tenantId: TENANT_ID,
  ownerType: "PROMOCION",
  ownerId: LEAD_ID,
  kind: "DOCUMENT",
  r2Key: "exports/lead-1.csv",
  mimeType: "text/csv",
  sizeBytes: 512,
  altText: "Exportación ARSOP lead lead-1",
  sortOrder: 0,
  isCover: false,
  createdAt: NOW,
};

function createMockMediaService() {
  return {
    uploadImage: vi.fn().mockResolvedValue(mockMediaAsset),
    signedReadUrl: vi.fn(),
    getPublicUrl: vi.fn(),
    reorderGallery: vi.fn(),
    setCover: vi.fn(),
    delete: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// ArsopRepository
// ---------------------------------------------------------------------------

describe("ArsopRepository", () => {
  describe("exportLead", () => {
    it("generates CSV, uploads via MediaService, and inserts arsop_request", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const mediaService = createMockMediaService();
      const repo = new ArsopRepository(ctx, mediaService as never);

      // Sequence: find lead, get notes, get history, get consent records, insert arsop_request
      const arsopRequestRow = {
        id: "arsop-1",
        tenantId: TENANT_ID,
        leadId: LEAD_ID,
        requestType: "EXPORT",
        requestedAt: NOW,
        processedBy: ADMIN_ID,
        processedAt: NOW,
        resultAssetId: "asset-1",
      };
      setupMockTransaction(mockWithTx, [
        [baseLeadRow], // find lead
        [baseNoteRow], // get notes
        [baseHistoryRow], // get history
        [baseConsentRow], // get consent records
        [arsopRequestRow], // insert arsop_request
      ]);

      const result = await repo.exportLead(LEAD_ID, ADMIN_ID);

      expect(result).not.toBeNull();
      expect(result.requestType).toBe("EXPORT");
      expect(result.leadId).toBe(LEAD_ID);
      expect(result.processedBy).toBe(ADMIN_ID);
      expect(result.resultAssetId).toBe("asset-1");

      // Verify MediaService.uploadImage was called with CSV content
      expect(mediaService.uploadImage).toHaveBeenCalledTimes(1);
      const uploadCall = mediaService.uploadImage.mock.calls[0]![0];
      expect(uploadCall.fileName).toContain(".csv");
      expect(uploadCall.mimeType).toBe("text/csv");
      expect(uploadCall.kind).toBe("DOCUMENT");
      // CSV content should contain lead data
      const csvContent = uploadCall.file.toString("utf-8");
      expect(csvContent).toContain("Juan Perez");
      expect(csvContent).toContain("juan@example.com");
    });

    it("throws when lead is not found", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const mediaService = createMockMediaService();
      const repo = new ArsopRepository(ctx, mediaService as never);

      setupMockTransaction(mockWithTx, [[]]);

      await expect(
        repo.exportLead("nonexistent", ADMIN_ID),
      ).rejects.toThrow("Lead not found");
    });
  });

  describe("deleteLead", () => {
    it("deletes in cascade order and inserts arsop_request record", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const mediaService = createMockMediaService();
      const repo = new ArsopRepository(ctx, mediaService as never);

      // Sequence: find lead, insert arsop_request, delete read_marks, delete notes,
      // delete history, delete consent_records, delete lead
      const arsopRequestRow = {
        id: "arsop-2",
        tenantId: TENANT_ID,
        leadId: LEAD_ID,
        requestType: "DELETE",
        requestedAt: NOW,
        processedBy: ADMIN_ID,
        processedAt: NOW,
        resultAssetId: null,
      };
      setupMockTransaction(mockWithTx, [
        [baseLeadRow],    // find lead
        [arsopRequestRow], // insert arsop_request (before deletion)
        [],               // delete read marks
        [],               // delete notes
        [],               // delete history
        [],               // delete consent_records
        [],               // delete lead
      ]);

      const result = await repo.deleteLead(LEAD_ID, ADMIN_ID);

      expect(result).not.toBeNull();
      expect(result.requestType).toBe("DELETE");
      expect(result.leadId).toBe(LEAD_ID);
      expect(result.processedBy).toBe(ADMIN_ID);
      expect(result.resultAssetId).toBeNull();
    });

    it("throws when lead is not found for deletion", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const mediaService = createMockMediaService();
      const repo = new ArsopRepository(ctx, mediaService as never);

      setupMockTransaction(mockWithTx, [[]]);

      await expect(
        repo.deleteLead("nonexistent", ADMIN_ID),
      ).rejects.toThrow("Lead not found");
    });
  });

  describe("immutability", () => {
    function createRejectingTx() {
      return new Proxy({} as Record<string, unknown>, {
        get(_target, prop: string | symbol) {
          if (typeof prop === "string" && ["update", "delete"].includes(prop)) {
            return () => ({
              set: vi.fn().mockReturnThis(),
              values: vi.fn().mockReturnThis(),
              where: vi.fn().mockRejectedValue(
                new Error("Immutable: arsop_requests cannot be modified"),
              ),
            });
          }
          return () => Promise.resolve([]);
        },
      });
    }

    it("rejects UPDATE on arsop_requests", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });

      mockWithTx.mockImplementation(async (fn) => fn(createRejectingTx()));

      await expect(
        ctx.withTransaction(async (tx) => {
          await (tx.update(arsopRequests) as never)
            .set({ requestType: "EXPORT" })
            .where(eq(arsopRequests.id, "arsop-1"));
        }),
      ).rejects.toThrow("Immutable");
    });

    it("rejects DELETE on arsop_requests", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });

      mockWithTx.mockImplementation(async (fn) => fn(createRejectingTx()));

      await expect(
        ctx.withTransaction(async (tx) => {
          await (tx.delete(arsopRequests) as never).where(
            eq(arsopRequests.id, "arsop-1"),
          );
        }),
      ).rejects.toThrow("Immutable");
    });
  });
});
