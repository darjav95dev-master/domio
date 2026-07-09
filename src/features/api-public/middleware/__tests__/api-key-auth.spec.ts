/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContextResolutionError } from "@/infrastructure/tenant/context-middleware";

// ─── Mock ApiKeyContext ──────────────────────────────────────────────────────

const mockApiKeyContext = {
  type: "apikey" as const,
  apiKeyId: "",
  getTenantId: () => "tenant-1",
  withTransaction: vi.fn(),
  resolveFilters: () => ({ kind: "portfolio" as const, status: "PUBLISHED" as const }),
};

vi.mock("@/infrastructure/tenant/ApiKeyContext", () => ({
  ApiKeyContext: vi.fn().mockImplementation((tenantId: string, apiKeyId: string) => ({
    ...mockApiKeyContext,
    apiKeyId,
    getTenantId: () => tenantId,
  })),
}));

// ─── Mock bcryptjs ───────────────────────────────────────────────────────────

const mockBcryptCompare = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    compare: mockBcryptCompare,
  },
  compare: mockBcryptCompare,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("extractApiKeyFromRequest", () => {
  it("should extract key from x-api-key header", async () => {
    const { extractApiKeyFromRequest } = await import("../api-key-auth");
    const request = new Request("https://api.domio.com/api/v1/promociones", {
      headers: { "x-api-key": "my-api-key" },
    });
    expect(extractApiKeyFromRequest(request)).toBe("my-api-key");
  });

  it("should extract key from Authorization Bearer header", async () => {
    const { extractApiKeyFromRequest } = await import("../api-key-auth");
    const request = new Request("https://api.domio.com/api/v1/promociones", {
      headers: { authorization: "Bearer my-bearer-key" },
    });
    expect(extractApiKeyFromRequest(request)).toBe("my-bearer-key");
  });

  it("should prefer Authorization Bearer over x-api-key", async () => {
    const { extractApiKeyFromRequest } = await import("../api-key-auth");
    const request = new Request("https://api.domio.com/api/v1/promociones", {
      headers: {
        authorization: "Bearer bearer-key",
        "x-api-key": "x-api-key-value",
      },
    });
    expect(extractApiKeyFromRequest(request)).toBe("bearer-key");
  });

  it("should return null when no header is present", async () => {
    const { extractApiKeyFromRequest } = await import("../api-key-auth");
    const request = new Request("https://api.domio.com/api/v1/promociones");
    expect(extractApiKeyFromRequest(request)).toBeNull();
  });

  it("should reject Bearer with no token", async () => {
    const { extractApiKeyFromRequest } = await import("../api-key-auth");
    const request = new Request("https://api.domio.com/api/v1/promociones", {
      headers: { authorization: "Bearer " },
    });
    expect(extractApiKeyFromRequest(request)).toBeNull();
  });

  it("should reject Authorization header without Bearer prefix", async () => {
    const { extractApiKeyFromRequest } = await import("../api-key-auth");
    const request = new Request("https://api.domio.com/api/v1/promociones", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(extractApiKeyFromRequest(request)).toBeNull();
  });
});

describe("findMatchingApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return matched key when bcrypt.compare returns true", async () => {
    const { findMatchingApiKey } = await import("../api-key-auth");

    mockBcryptCompare.mockResolvedValue(true);

    const mockFindKeys = vi.fn().mockResolvedValue([
      { id: "key-001", tenantId: "tenant-1", keyHash: "$2a$12$hash1", rateLimitPerMin: 60 },
      { id: "key-002", tenantId: "tenant-1", keyHash: "$2a$12$hash2", rateLimitPerMin: 30 },
    ]);

    const result = await findMatchingApiKey("valid-key", mockFindKeys);
    expect(result).toEqual({ id: "key-001", tenantId: "tenant-1", rateLimitPerMin: 60 });
    expect(mockFindKeys).toHaveBeenCalledOnce();
    expect(mockBcryptCompare).toHaveBeenCalledWith("valid-key", expect.any(String));
  });

  it("should return null when no active keys exist", async () => {
    const { findMatchingApiKey } = await import("../api-key-auth");

    const mockFindKeys = vi.fn().mockResolvedValue([]);
    const result = await findMatchingApiKey("any-key", mockFindKeys);
    expect(result).toBeNull();
  });

  it("should return null when no hash matches", async () => {
    const { findMatchingApiKey } = await import("../api-key-auth");

    mockBcryptCompare.mockResolvedValue(false);

    const mockFindKeys = vi.fn().mockResolvedValue([
      { id: "key-001", tenantId: "tenant-1", keyHash: "$2a$12$hash1", rateLimitPerMin: 60 },
    ]);

    const result = await findMatchingApiKey("wrong-key", mockFindKeys);
    expect(result).toBeNull();
  });
});

describe("validateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ApiKeyContext for a valid API key", async () => {
    const { validateApiKey } = await import("../api-key-auth");

    mockBcryptCompare.mockResolvedValue(true);

    const mockFindKeys = vi.fn().mockResolvedValue([
      { id: "key-001", tenantId: "tenant-1", keyHash: "$2a$12$hash", rateLimitPerMin: 60 },
    ]);
    const mockTouch = vi.fn().mockResolvedValue(undefined);

    const request = new Request("https://api.domio.com/api/v1/promociones", {
      headers: { "x-api-key": "valid-key" },
    });

    const ctx = await validateApiKey(request, {
      findActiveKeysFn: mockFindKeys,
      touchLastUsedAtFn: mockTouch,
    });

    expect(ctx).toBeDefined();
    expect(ctx.type).toBe("apikey");
    expect(mockTouch).toHaveBeenCalledWith("key-001");
  });

  it("should throw 401 when no API key is present", async () => {
    const { validateApiKey } = await import("../api-key-auth");
    const request = new Request("https://api.domio.com/api/v1/promociones");

    await expect(validateApiKey(request)).rejects.toThrow(ContextResolutionError);
    await expect(validateApiKey(request)).rejects.toHaveProperty("status", 401);
  });

  it("should throw 403 when key does not match", async () => {
    const { validateApiKey } = await import("../api-key-auth");

    mockBcryptCompare.mockResolvedValue(false);
    const mockFindKeys = vi.fn().mockResolvedValue([]);

    const request = new Request("https://api.domio.com/api/v1/promociones", {
      headers: { "x-api-key": "unknown-key" },
    });

    await expect(
      validateApiKey(request, { findActiveKeysFn: mockFindKeys }),
    ).rejects.toThrow(ContextResolutionError);
    await expect(
      validateApiKey(request, { findActiveKeysFn: mockFindKeys }),
    ).rejects.toHaveProperty("status", 403);
  });

  it("should call touchLastUsedAt for valid keys", async () => {
    const { validateApiKey } = await import("../api-key-auth");

    mockBcryptCompare.mockResolvedValue(true);

    const mockFindKeys = vi.fn().mockResolvedValue([
      { id: "key-001", tenantId: "tenant-1", keyHash: "$2a$12$hash", rateLimitPerMin: 60 },
    ]);
    const mockTouch = vi.fn().mockResolvedValue(undefined);

    const request = new Request("https://api.domio.com/api/v1/promociones", {
      headers: { "x-api-key": "valid-key" },
    });

    await validateApiKey(request, {
      findActiveKeysFn: mockFindKeys,
      touchLastUsedAtFn: mockTouch,
    });

    expect(mockTouch).toHaveBeenCalledWith("key-001");
  });
});
