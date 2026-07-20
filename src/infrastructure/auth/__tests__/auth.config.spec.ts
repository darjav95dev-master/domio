import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth to avoid Edge/Node runtime resolution in test environment
vi.mock("next-auth", () => {
  const mockHandlers = { GET: vi.fn(), POST: vi.fn() };
  const mockAuth = vi.fn();
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();

  return {
    default: vi.fn(() => ({
      handlers: mockHandlers,
      auth: mockAuth,
      signIn: mockSignIn,
      signOut: mockSignOut,
    })),
  };
});

// Mock next-auth/providers/credentials — it's a re-export from @auth/core
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => ({ ...(config as object), type: "credentials" })),
}));

// Mock the tenant context so the jwt re-verify branch never touches a real DB.
const mockWithTransaction = vi.fn();
const MockAuthenticatedContext = vi.fn(
  (tenantId: string, userId: string, role: string) => ({
    tenantId,
    userId,
    role,
    withTransaction: mockWithTransaction,
  }),
);
vi.mock("@/infrastructure/tenant/AuthenticatedContext", () => ({
  AuthenticatedContext: MockAuthenticatedContext,
}));

describe("auth.config module", () => {
  it("should export handlers, signIn, signOut, and auth", async () => {
    const mod = await import("../auth.config");
    expect(mod).toHaveProperty("handlers");
    expect(mod).toHaveProperty("signIn");
    expect(mod).toHaveProperty("signOut");
    expect(mod).toHaveProperty("auth");
  });

  it("should have GET and POST handlers", async () => {
    const mod = await import("../auth.config");
    expect(typeof mod.handlers.GET).toBe("function");
    expect(typeof mod.handlers.POST).toBe("function");
  });

  it("should have signIn and signOut as functions", async () => {
    const mod = await import("../auth.config");
    expect(typeof mod.signIn).toBe("function");
    expect(typeof mod.signOut).toBe("function");
  });

  it("should have auth as function", async () => {
    const mod = await import("../auth.config");
    expect(typeof mod.auth).toBe("function");
  });
});

describe("jwt callback — periodic isActive re-verification", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type JwtCallback = (params: any) => Promise<any>;

  async function getJwt(): Promise<JwtCallback> {
    const { authConfig } = await import("../auth.config");
    return authConfig.callbacks!.jwt as unknown as JwtCallback;
  }

  const STALE = 0; // lastVerifiedAt far in the past → past the 30-min window
  const baseToken = {
    user_id: "user-1",
    tenant_id: "tenant-1",
    role: "AGENT",
    lastVerifiedAt: STALE,
  };

  beforeEach(() => {
    mockWithTransaction.mockReset();
    MockAuthenticatedContext.mockClear();
  });

  it("destroys the session (returns null) when the user is now inactive", async () => {
    mockWithTransaction.mockResolvedValue([{ isActive: false }]);
    const jwt = await getJwt();

    const result = await jwt({ token: { ...baseToken } });

    expect(result).toBeNull();
  });

  it("keeps the session and refreshes lastVerifiedAt when still active", async () => {
    mockWithTransaction.mockResolvedValue([{ isActive: true }]);
    const jwt = await getJwt();

    const result = await jwt({ token: { ...baseToken } });

    expect(result).not.toBeNull();
    expect(result.user_id).toBe("user-1");
    expect(result.lastVerifiedAt).toBeGreaterThan(STALE);
    // The fix: query runs inside a tenant transaction with the JWT's tenant/user/role.
    expect(MockAuthenticatedContext).toHaveBeenCalledWith("tenant-1", "user-1", "AGENT");
  });

  it("skips the DB check while inside the verification window", async () => {
    const jwt = await getJwt();

    const result = await jwt({ token: { ...baseToken, lastVerifiedAt: Date.now() } });

    expect(result).not.toBeNull();
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });
});
