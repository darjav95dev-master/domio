/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getApiKeysAction,
  createApiKeyAction,
  revokeApiKeyAction,
} from "./api-keys.actions";
import type { UserRole } from "@/shared/constants/db-enums";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.hoisted(() => vi.fn());

const mockFindAll = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockRevoke = vi.hoisted(() => vi.fn());

vi.mock("@/infrastructure/db/repositories/api-key.repository", () => ({
  ApiKeyRepository: vi.fn(() => ({
    findAll: mockFindAll,
    create: mockCreate,
    revoke: mockRevoke,
  })),
}));

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const adminSession = {
  userId: "admin-1",
  tenantId: "tenant-1",
  role: "ADMIN" as UserRole,
  name: "Admin",
};

const operatorSession = {
  userId: "op-1",
  tenantId: "tenant-1",
  role: "OPERATOR" as UserRole,
  name: "Operator",
};

const mockApiKeyRow = {
  id: "key-1",
  tenantId: "tenant-1",
  keyHash: "hash",
  name: "Test Key",
  isActive: true,
  rateLimitPerMin: 60,
  createdBy: "admin-1",
  createdAt: new Date("2026-01-01"),
  lastUsedAt: null as Date | null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getApiKeysAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return API keys when admin calls with no filters", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockFindAll.mockResolvedValue({ items: [mockApiKeyRow], total: 1 });

    const result = await getApiKeysAction({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
    }
    expect(mockFindAll).toHaveBeenCalledWith({ isActive: undefined });
  });

  it("should filter by isActive", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockFindAll.mockResolvedValue({ items: [mockApiKeyRow], total: 1 });

    const result = await getApiKeysAction({ isActive: true });

    expect(result.success).toBe(true);
    expect(mockFindAll).toHaveBeenCalledWith({ isActive: true });
  });

  it("should reject non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(operatorSession);

    const result = await getApiKeysAction({});

    expect(result.success).toBe(false);
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it("should reject unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await getApiKeysAction({});

    expect(result.success).toBe(false);
    expect(mockFindAll).not.toHaveBeenCalled();
  });
});

describe("createApiKeyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an API key and return plain key", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockCreate.mockImplementation(async (name: string, rateLimit: number) => ({
      ...mockApiKeyRow,
      name,
      rateLimitPerMin: rateLimit,
      plainKey: "dom_abc123def456",
    }));

    const result = await createApiKeyAction("My Key", 120);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Key");
      expect(result.data.plainKey).toBe("dom_abc123def456");
      expect(result.data.rateLimitPerMin).toBe(120);
    }
    expect(mockCreate).toHaveBeenCalledWith("My Key", 120);
  });

  it("should use default rate limit when not provided", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockCreate.mockImplementation(async (name: string, rateLimit: number) => ({
      ...mockApiKeyRow,
      name,
      rateLimitPerMin: rateLimit,
      plainKey: "dom_abc",
    }));

    const result = await createApiKeyAction("My Key");

    expect(result.success).toBe(true);
    // The schema default(60) fills in the value
    expect(mockCreate).toHaveBeenCalledWith("My Key", 60);
  });

  it("should reject non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(operatorSession);

    const result = await createApiKeyAction("My Key");

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should reject empty name", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);

    const result = await createApiKeyAction("");

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("revokeApiKeyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should revoke an API key", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockRevoke.mockResolvedValue({ ...mockApiKeyRow, isActive: false });

    const result = await revokeApiKeyAction("key-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
    expect(mockRevoke).toHaveBeenCalledWith("key-1");
  });

  it("should reject non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(operatorSession);

    const result = await revokeApiKeyAction("key-1");

    expect(result.success).toBe(false);
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it("should reject unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await revokeApiKeyAction("key-1");

    expect(result.success).toBe(false);
    expect(mockRevoke).not.toHaveBeenCalled();
  });
});
