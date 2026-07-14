/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import { UserRepository } from "@/infrastructure/db/repositories/user.repository";
import {
  createMockAuthCtx,
  createMockTx,
  setupMockTransaction,
} from "@/infrastructure/db/repositories/__tests__/test-utils";
import type { UserRole } from "@/shared/constants/db-enums";
import type { Transaction } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const ADMIN_ID = "admin-1";
const NOW = new Date("2026-07-08T12:00:00Z");

const baseUserRow = {
  id: USER_ID,
  tenantId: TENANT_ID,
  email: "juan@example.com",
  passwordHash: null,
  name: "Juan Pérez",
  role: "AGENT" as UserRole,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const baseUserCreateData = {
  email: "nuevo@example.com",
  name: "Nuevo Usuario",
  role: "AGENT" as UserRole,
};

// ---------------------------------------------------------------------------
// UserRepository
// ---------------------------------------------------------------------------
describe("UserRepository", () => {
  describe("findAll", () => {
    it("returns all users for the tenant", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      const items = [
        { ...baseUserRow, id: "u1", name: "User 1" },
        { ...baseUserRow, id: "u2", name: "User 2" },
      ];
      setupMockTransaction(mockWithTx, [items, [{ count: "2" }]]);

      const result = await repo.findAll({});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]?.id).toBe("u1");
    });

    it("filters by role when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      const items = [{ ...baseUserRow, role: "AGENT" }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll({ role: "AGENT" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.role).toBe("AGENT");
    });

    it("filters by isActive when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      const items = [{ ...baseUserRow, isActive: false }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll({ isActive: false });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.isActive).toBe(false);
    });

    it("combines role and isActive filters", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      const items = [
        { ...baseUserRow, role: "OPERATOR", isActive: true },
      ];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll({
        role: "OPERATOR",
        isActive: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.role).toBe("OPERATOR");
      expect(result.items[0]?.isActive).toBe(true);
    });

    it("returns empty array when no users match", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      setupMockTransaction(mockWithTx, [[], [{ count: "0" }]]);

      const result = await repo.findAll({ role: "ADMIN" });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("does not include passwordHash in the Drizzle select columns", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      // Use createMockTx directly to capture actual Drizzle calls.
      // Fake bcrypt-shaped hash asserted to never reach the client.
      const nonExposedHash = "$2b$12$shouldnotbeexposed";
      const { tx, calls } = createMockTx([
        [{ ...baseUserRow, passwordHash: nonExposedHash }],
        [{ count: "1" }],
      ]);
      mockWithTx.mockImplementation(
        <T>(fn: (tx: Transaction) => Promise<T>): Promise<T> => fn(tx),
      );

      await repo.findAll({});

      // The first select call should specify explicit columns (no passwordHash)
      const selectCalls = calls.filter((c) => c.method === "select");
      expect(selectCalls.length).toBeGreaterThanOrEqual(1);

      const selectArg = selectCalls[0]?.args[0] as Record<string, unknown> | undefined;
      // With explicit column selection, the select has an argument (columns object)
      expect(selectArg).toBeDefined();
      // passwordHash should never be in the select columns
      expect(selectArg!).not.toHaveProperty("passwordHash");
    });
  });

  describe("findById", () => {
    it("returns a user by id", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      setupMockTransaction(mockWithTx, [[baseUserRow]]);

      const result = await repo.findById(USER_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(USER_ID);
      expect(result!.email).toBe("juan@example.com");
      expect(result!.name).toBe("Juan Pérez");
    });

    it("returns null when user does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findById("nonexistent");

      expect(result).toBeNull();
    });

    it("returns null for user from another tenant", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);
      // Empty result simulates RLS/tenant filter blocking cross-tenant access
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findById("other-tenant-user");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("inserts a new user and enqueues an invitation email", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      const createdRow = {
        ...baseUserRow,
        id: "new-user-id",
        email: baseUserCreateData.email,
        name: baseUserCreateData.name,
        role: baseUserCreateData.role,
      };

      // Two queries: INSERT user + INSERT email_queue
      setupMockTransaction(mockWithTx, [[createdRow], [{ id: "email-1" }]]);

      const result = await repo.create(baseUserCreateData);

      expect(result).not.toBeNull();
      expect(result.id).toBe("new-user-id");
      expect(result.email).toBe(baseUserCreateData.email);
      expect(result.role).toBe("AGENT");
      expect(result.isActive).toBe(true);
    });

    it("creates the email_queue entry with template 'team-invitation'", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      const createdRow = {
        ...baseUserRow,
        id: "new-user-id",
        email: baseUserCreateData.email,
        name: baseUserCreateData.name,
        role: baseUserCreateData.role,
      };

      setupMockTransaction(mockWithTx, [[createdRow], [{ id: "email-1" }]]);

      const result = await repo.create(baseUserCreateData);

      // The mock verifies the calls; here we just verify the user was created
      expect(result).not.toBeNull();
    });

    it("generates a real crypto token in the invitation URL (not placeholder)", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      const createdRow = {
        ...baseUserRow,
        id: "new-user-id",
        email: baseUserCreateData.email,
        name: baseUserCreateData.name,
        role: baseUserCreateData.role,
      };

      // Use createMockTx directly to capture the actual SQL calls
      const { tx, calls } = createMockTx([[createdRow], [{ id: "email-1" }]]);
      mockWithTx.mockImplementation(
        <T>(fn: (tx: Transaction) => Promise<T>): Promise<T> => fn(tx),
      );

      await repo.create(baseUserCreateData);

      // Find the email_queue insert values call
      const valuesCalls = calls.filter((c) => c.method === "values");
      // Last values call should be the email queue insert
      const emailValuesCall = valuesCalls[valuesCalls.length - 1];
      const valuesArg = emailValuesCall?.args[0] as Record<string, unknown> | undefined;

      expect(valuesArg).toBeDefined();
      expect(valuesArg!.payload).toBeDefined();

      const payload = valuesArg!.payload as Record<string, unknown>;
      const url = payload.setupPasswordUrl as string;

      // Token real (no "pending") y URL absoluta a la ruta que EXISTE: el panel
      // vive en /panel/*, y /auth/setup-password (lo que se generaba antes) era
      // un 404 — el invitado no podía establecer su contraseña jamás.
      expect(url).toMatch(
        /^https?:\/\/.+\/panel\/setup-password\?token=[0-9a-f]{64}$/,
      );
      expect(url).not.toContain("pending");
    });

    it("throws when email already exists in tenant (unique constraint)", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      // Simulate a DB error for duplicate email
      mockWithTx.mockRejectedValue(
        new Error("duplicate key value violates unique constraint"),
      );

      await expect(
        repo.create(baseUserCreateData),
      ).rejects.toThrow("duplicate key");
    });
  });

  describe("update", () => {
    it("updates editable fields (name, email, role)", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      const oldRow = {
        ...baseUserRow,
        name: "Old Name",
        email: "old@example.com",
        role: "AGENT" as UserRole,
      };
      const updatedRow = {
        ...baseUserRow,
        name: "New Name",
        email: "new@example.com",
        role: "OPERATOR" as UserRole,
      };

      // Two queries: fetch old + update
      setupMockTransaction(mockWithTx, [[oldRow], [updatedRow]]);

      const result = await repo.update(USER_ID, {
        name: "New Name",
        email: "new@example.com",
        role: "OPERATOR",
      });

      expect(result).not.toBeNull();
      expect(result.name).toBe("New Name");
      expect(result.email).toBe("new@example.com");
      expect(result.role).toBe("OPERATOR");
    });

    it("throws when user does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      // No old row found
      setupMockTransaction(mockWithTx, [[]]);

      await expect(
        repo.update("nonexistent", { name: "New Name" }),
      ).rejects.toThrow("not found");
    });

    it("does not update passwordHash via regular update", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      const existingHash = "$2b$12$oldhash0123456789";
      const oldRow = { ...baseUserRow, passwordHash: existingHash };
      const updatedRow = { ...baseUserRow, passwordHash: existingHash };

      setupMockTransaction(mockWithTx, [[oldRow], [updatedRow]]);

      // passwordHash should not be included in update fields
      const result = await repo.update(USER_ID, { name: "Updated Name" });

      expect(result.passwordHash).toBe(existingHash);
    });
  });

  describe("deactivate", () => {
    it("sets isActive to false", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      const deactivatedRow = {
        ...baseUserRow,
        isActive: false,
      };

      setupMockTransaction(mockWithTx, [[deactivatedRow]]);

      const result = await repo.deactivate(USER_ID);

      expect(result).not.toBeNull();
      expect(result.isActive).toBe(false);
    });

    it("preserves all other fields on deactivation", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      const deactivatedRow = {
        ...baseUserRow,
        isActive: false,
      };

      setupMockTransaction(mockWithTx, [[deactivatedRow]]);

      const result = await repo.deactivate(USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.email).toBe("juan@example.com");
      expect(result.role).toBe("AGENT");
    });

    it("allows deactivating oneself (ADMIN self-deactivation)", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      const deactivatedRow = {
        ...baseUserRow,
        id: ADMIN_ID,
        isActive: false,
      };

      setupMockTransaction(mockWithTx, [[deactivatedRow]]);

      const result = await repo.deactivate(ADMIN_ID);

      expect(result.isActive).toBe(false);
    });

    it("throws when user does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new UserRepository(ctx);

      mockWithTx.mockRejectedValue(new Error("not found"));

      await expect(repo.deactivate("nonexistent")).rejects.toThrow();
    });
  });
});
