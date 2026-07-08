/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import { ContactConfigRepository } from "../contact-config.repository";
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

const baseContactConfigRow = {
  tenantId: TENANT_ID,
  phone: "+34 900 123 456",
  email: "info@domio.es",
  address: "Calle Ejemplo 123, Santa Cruz de Tenerife",
  hours: "Lun-Vie 9:00-18:00",
  whatsappNumber: "+34 600 123 456",
  whatsappPrefilledMessage: "Hola, me interesa una propiedad",
  updatedBy: USER_ID,
  updatedAt: NOW,
};

const newContactData = {
  phone: "+34 900 999 999",
  email: "contacto@domio.es",
  address: "Av. Nueva 456",
  hours: "Lun-Sáb 10:00-20:00",
  whatsappNumber: "+34 600 999 999",
  whatsappPrefilledMessage: "Hola, quiero información",
};

// ---------------------------------------------------------------------------
// ContactConfigRepository
// ---------------------------------------------------------------------------
describe("ContactConfigRepository", () => {
  describe("findByTenant", () => {
    it("returns the contact config for the given tenant", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContactConfigRepository(ctx);
      setupMockTransaction(mockWithTx, [[baseContactConfigRow]]);

      const result = await repo.findByTenant(TENANT_ID);

      expect(result).not.toBeNull();
      expect(result!.phone).toBe("+34 900 123 456");
      expect(result!.email).toBe("info@domio.es");
      expect(result!.tenantId).toBe(TENANT_ID);
    });

    it("returns null when no config exists for the tenant", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ContactConfigRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findByTenant(TENANT_ID);

      expect(result).toBeNull();
    });
  });

  describe("upsert", () => {
    it("creates a new contact config when none exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ContactConfigRepository(ctx);

      const createdRow = {
        ...baseContactConfigRow,
        ...newContactData,
        tenantId: TENANT_ID,
        updatedBy: USER_ID,
      };
      // Single INSERT with ON CONFLICT → [createdRow]
      setupMockTransaction(mockWithTx, [[createdRow]]);

      const result = await repo.upsert(TENANT_ID, newContactData, USER_ID);

      expect(result).not.toBeNull();
      expect(result.phone).toBe("+34 900 999 999");
      expect(result.email).toBe("contacto@domio.es");
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it("updates an existing contact config when it exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ContactConfigRepository(ctx);

      const updatedRow = {
        ...baseContactConfigRow,
        phone: "+34 900 999 999",
        updatedBy: USER_ID,
      };
      // Single INSERT with ON CONFLICT DO UPDATE → [updatedRow]
      setupMockTransaction(mockWithTx, [[updatedRow]]);

      const result = await repo.upsert(
        TENANT_ID,
        { phone: "+34 900 999 999" },
        USER_ID,
      );

      expect(result).not.toBeNull();
      expect(result.phone).toBe("+34 900 999 999");
    });
  });
});
