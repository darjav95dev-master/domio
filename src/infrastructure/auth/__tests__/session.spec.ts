import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth.config module before any imports
const mockAuth = vi.fn();
vi.mock("../auth.config", () => ({
  auth: mockAuth,
}));

const SAMPLE_EXPIRES = "2026-07-08T00:00:00.000Z";

describe("getServerSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no session exists", async () => {
    mockAuth.mockResolvedValue(null);
    const { getServerSession } = await import("../session");
    const result = await getServerSession();
    expect(result).toBeNull();
  });

  it("should return null when session has no user", async () => {
    mockAuth.mockResolvedValue({ expires: SAMPLE_EXPIRES });
    const { getServerSession } = await import("../session");
    const result = await getServerSession();
    expect(result).toBeNull();
  });

  it("should return typed session data when user is present", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        tenant_id: "tenant-1",
        role: "ADMIN",
        name: "Admin User",
      },
      expires: SAMPLE_EXPIRES,
    });
    const { getServerSession } = await import("../session");
    const result = await getServerSession();
    expect(result).toEqual({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      name: "Admin User",
    });
  });

  it("should return null when session user id is missing", async () => {
    mockAuth.mockResolvedValue({
      user: {
        tenant_id: "tenant-1",
        role: "OPERATOR",
        name: "Test User",
      },
      expires: SAMPLE_EXPIRES,
    });
    const { getServerSession } = await import("../session");
    const result = await getServerSession();
    expect(result).toBeNull();
  });

  it("should return session with null name when user name is null", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-2",
        tenant_id: "tenant-1",
        role: "OPERATOR",
        name: null,
      },
      expires: SAMPLE_EXPIRES,
    });
    const { getServerSession } = await import("../session");
    const result = await getServerSession();
    expect(result).toEqual({
      userId: "user-2",
      tenantId: "tenant-1",
      role: "OPERATOR",
      name: null,
    });
  });
});
