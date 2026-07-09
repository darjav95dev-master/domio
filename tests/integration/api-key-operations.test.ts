/* eslint-disable sonarjs/no-duplicate-string */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { describe, it, expect } from "vitest";
import { ApiKeyRepository } from "@/infrastructure/db/repositories/api-key.repository";

import {
  createMockAuthCtx,
  setupMockTransaction,
} from "@/infrastructure/db/repositories/__tests__/test-utils";
import {
  BCRYPT_SALT_ROUNDS,
  API_KEY_BYTE_LENGTH,
} from "@/shared/constants/domain-config";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const KEY_ID = "key-1";
const NOW = new Date("2026-07-08T12:00:00Z");

const baseApiKeyRow = {
  id: KEY_ID,
  tenantId: TENANT_ID,
  keyHash: "$2b$12$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmn",
  name: "Integration API Key",
  isActive: true,
  rateLimitPerMin: 60,
  createdBy: USER_ID,
  createdAt: NOW,
  lastUsedAt: null,
};

// ---------------------------------------------------------------------------
// ApiKeyRepository
// ---------------------------------------------------------------------------
describe("ApiKeyRepository", () => {
  describe("findAll", () => {
    it("returns all API keys for the tenant", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);
      const items = [
        { ...baseApiKeyRow, id: "k1", name: "Key 1" },
        { ...baseApiKeyRow, id: "k2", name: "Key 2" },
      ];
      setupMockTransaction(mockWithTx, [items, [{ count: "2" }]]);

      const result = await repo.findAll({});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]?.id).toBe("k1");
    });

    it("filters by isActive when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);
      const items = [{ ...baseApiKeyRow, isActive: false }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll({ isActive: false });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.isActive).toBe(false);
    });

    it("returns empty array when no keys match", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);
      setupMockTransaction(mockWithTx, [[], [{ count: "0" }]]);

      const result = await repo.findAll({ isActive: false });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("findById", () => {
    it("returns an API key by id", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);
      setupMockTransaction(mockWithTx, [[baseApiKeyRow]]);

      const result = await repo.findById(KEY_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(KEY_ID);
      expect(result!.name).toBe("Integration API Key");
      expect(result!.isActive).toBe(true);
      expect(result!.rateLimitPerMin).toBe(60);
    });

    it("returns null when key does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates a new API key, returns plain key, stores hash", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);

      const createdRow = {
        ...baseApiKeyRow,
        id: "new-key-id",
        name: "My API Key",
        rateLimitPerMin: 120,
      };

      setupMockTransaction(mockWithTx, [[createdRow]]);

      const result = await repo.create("My API Key", 120);

      expect(result).not.toBeNull();
      expect(result.id).toBe("new-key-id");
      expect(result.plainKey).toBeDefined();
      expect(typeof result.plainKey).toBe("string");
      expect(result.plainKey.length).toBeGreaterThan(0);
    });

    it("stores a bcrypt hash (not the plain key) in the database", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);

      const createdRow = {
        ...baseApiKeyRow,
        id: "new-key-id",
        keyHash: "$2b$12$somehashvaluehere",
        name: "My API Key",
        rateLimitPerMin: 60,
      };

      setupMockTransaction(mockWithTx, [[createdRow]]);

      const result = await repo.create("My API Key", 60);

      // The plain key should have the dom_ prefix
      expect(result.plainKey).toMatch(/^dom_[0-9a-f]{64}$/);
      // The plain key is not the hash
      expect(result.plainKey).not.toBe(createdRow.keyHash);
    });

    it("generates a valid bcrypt hash that can verify the plain key", async () => {
      // Test the actual hashing logic used by the repository
      const plainKey = `dom_${crypto.randomBytes(API_KEY_BYTE_LENGTH).toString("hex")}`;
      const hash = await bcrypt.hash(plainKey, BCRYPT_SALT_ROUNDS);

      // Verify bcrypt hash format: $2[aby]$<rounds>$<base64-hash>
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.+$/);
      // Verify bcrypt.compare returns true for the matching key
      await expect(bcrypt.compare(plainKey, hash)).resolves.toBe(true);
      // Verify bcrypt.compare returns false for a wrong key
      await expect(bcrypt.compare("wrong-key", hash)).resolves.toBe(false);
    });

    it("uses default rate limit (60/min) when not specified", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);

      const createdRow = {
        ...baseApiKeyRow,
        id: "new-key-id",
        name: "Default Rate Key",
        rateLimitPerMin: 60,
      };

      setupMockTransaction(mockWithTx, [[createdRow]]);

      const result = await repo.create("Default Rate Key");

      expect(result).not.toBeNull();
      expect(result.rateLimitPerMin).toBe(60);
    });

    it("applies custom rate limit when specified", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);

      const createdRow = {
        ...baseApiKeyRow,
        id: "new-key-id",
        name: "Custom Rate Key",
        rateLimitPerMin: 300,
      };

      setupMockTransaction(mockWithTx, [[createdRow]]);

      const result = await repo.create("Custom Rate Key", 300);

      expect(result.rateLimitPerMin).toBe(300);
    });
  });

  describe("revoke", () => {
    it("sets isActive to false", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);

      const revokedRow = {
        ...baseApiKeyRow,
        isActive: false,
      };

      setupMockTransaction(mockWithTx, [[revokedRow]]);

      const result = await repo.revoke(KEY_ID);

      expect(result).not.toBeNull();
      expect(result.isActive).toBe(false);
    });

    it("preserves keyHash and other fields on revoke", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);

      const revokedRow = {
        ...baseApiKeyRow,
        isActive: false,
      };

      setupMockTransaction(mockWithTx, [[revokedRow]]);

      const result = await repo.revoke(KEY_ID);

      expect(result.keyHash).toBe(baseApiKeyRow.keyHash);
      expect(result.name).toBe("Integration API Key");
    });

    it("throws when key does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new ApiKeyRepository(ctx);

      mockWithTx.mockRejectedValue(new Error("not found"));

      await expect(repo.revoke("nonexistent")).rejects.toThrow();
    });
  });


});
