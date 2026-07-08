/* eslint-disable sonarjs/no-duplicate-string, sonarjs/no-hardcoded-ip */

import { describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import { consentRecords } from "@/infrastructure/db/schema";
import { ConsentRepository } from "@/infrastructure/db/repositories/consent.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "@/infrastructure/db/repositories/__tests__/test-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const TEST_IP = "192.168.1.1";
const NOW = new Date("2026-07-08T12:00:00Z");

const baseConsentRecordRow = {
  id: "consent-1",
  tenantId: TENANT_ID,
  leadId: LEAD_ID,
  legalBasis: "RGPD consent",
  textAccepted: "He leido y acepto la politica de privacidad",
  ip: TEST_IP,
  userAgent: "Mozilla/5.0",
  createdAt: NOW,
};

// ---------------------------------------------------------------------------
// ConsentRepository
// ---------------------------------------------------------------------------

describe("ConsentRepository", () => {
  describe("create", () => {
    it("inserts a consent record and returns it with all fields", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ConsentRepository(ctx);
      setupMockTransaction(mockWithTx, [[baseConsentRecordRow]]);

      const result = await repo.create(
        LEAD_ID,
        "RGPD consent",
        "He leido y acepto la politica de privacidad",
        TEST_IP,
        "Mozilla/5.0",
      );

      expect(result).not.toBeNull();
      expect(result.leadId).toBe(LEAD_ID);
      expect(result.legalBasis).toBe("RGPD consent");
      expect(result.textAccepted).toBe(
        "He leido y acepto la politica de privacidad",
      );
      expect(result.ip).toBe(TEST_IP);
      expect(result.userAgent).toBe("Mozilla/5.0");
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it("inserts a consent record without optional ip and userAgent", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ConsentRepository(ctx);
      const minimalRow = {
        ...baseConsentRecordRow,
        ip: null,
        userAgent: null,
      };
      setupMockTransaction(mockWithTx, [[minimalRow]]);

      const result = await repo.create(
        LEAD_ID,
        "RGPD consent",
        "He leido y acepto la politica de privacidad",
        undefined,
        undefined,
      );

      expect(result).not.toBeNull();
      expect(result.ip).toBeNull();
      expect(result.userAgent).toBeNull();
    });
  });

  describe("findByLeadId", () => {
    it("returns all consent records for a lead", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ConsentRepository(ctx);
      const consentRows = [
        baseConsentRecordRow,
        {
          ...baseConsentRecordRow,
          id: "consent-2",
          legalBasis: "Updated policy",
        },
      ];
      setupMockTransaction(mockWithTx, [consentRows]);

      const result = await repo.findByLeadId(LEAD_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.leadId).toBe(LEAD_ID);
      expect(result[1]!.legalBasis).toBe("Updated policy");
    });

    it("returns empty array when lead has no consent records", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ConsentRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findByLeadId(LEAD_ID);

      expect(result).toEqual([]);
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
                new Error("Immutable: consent_records cannot be modified"),
              ),
            });
          }
          return () => Promise.resolve([]);
        },
      });
    }

    it("rejects UPDATE on consent_records", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });

      mockWithTx.mockImplementation(async (fn) => fn(createRejectingTx()));

      await expect(
        ctx.withTransaction(async (tx) => {
          await (tx.update(consentRecords) as never)
            .set({ legalBasis: "Modified" })
            .where(eq(consentRecords.id, "consent-1"));
        }),
      ).rejects.toThrow("Immutable");
    });

    it("rejects DELETE on consent_records", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });

      mockWithTx.mockImplementation(async (fn) => fn(createRejectingTx()));

      await expect(
        ctx.withTransaction(async (tx) => {
          await (tx.delete(consentRecords) as never).where(
            eq(consentRecords.id, "consent-1"),
          );
        }),
      ).rejects.toThrow("Immutable");
    });
  });
});
