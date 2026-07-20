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

// Mocks for the authorize() flow: rate limiter, tenant DB context, bcrypt.
const mockIsIpLockedOut = vi.fn();
const mockCheckIpRateLimit = vi.fn();
vi.mock("@/infrastructure/rate-limiting/ip-rate-limit", () => ({
  isIpLockedOut: mockIsIpLockedOut,
  checkIpRateLimit: mockCheckIpRateLimit,
}));

const mockPublicWithTransaction = vi.fn();
vi.mock("@/infrastructure/tenant/PublicContext", () => ({
  PublicContext: vi.fn().mockImplementation(() => ({
    getTenantId: () => "tenant-1",
    withTransaction: mockPublicWithTransaction,
  })),
}));

const mockBcryptCompare = vi.fn();
vi.mock("bcryptjs", () => ({
  default: { compare: (...args: unknown[]) => mockBcryptCompare(...args) },
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
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

describe("authorize callback — login rate limiting", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Authorize = (credentials: any, req?: any) => Promise<any>;

  const ALLOWED = { allowed: true, remaining: 1, limit: 5, resetAt: new Date(), lockedOut: false };
  const DENIED = { allowed: false, remaining: 0, limit: 30, resetAt: new Date(), lockedOut: false };
  const CREDS = { email: "admin@domio.dev", password: "secret" };
  const REQ = { headers: { "x-forwarded-for": "203.0.113.9" } };
  const activeUser = {
    id: "user-1",
    email: "admin@domio.dev",
    name: "Admin",
    tenantId: "tenant-1",
    role: "ADMIN",
    passwordHash: "$2a$hash",
    isActive: true,
  };

  async function getAuthorize(): Promise<Authorize> {
    const { authConfig } = await import("../auth.config");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (authConfig.providers[0] as any).authorize as Authorize;
  }

  beforeEach(() => {
    mockIsIpLockedOut.mockReset().mockResolvedValue(false);
    mockCheckIpRateLimit.mockReset().mockResolvedValue(ALLOWED);
    mockPublicWithTransaction.mockReset().mockResolvedValue([activeUser]);
    mockBcryptCompare.mockReset().mockResolvedValue(true);
  });

  it("rejects a locked-out IP before any DB/bcrypt work (no token consumed)", async () => {
    mockIsIpLockedOut.mockResolvedValue(true);
    const authorize = await getAuthorize();

    const result = await authorize(CREDS, REQ);

    expect(result).toBeNull();
    expect(mockPublicWithTransaction).not.toHaveBeenCalled();
    expect(mockBcryptCompare).not.toHaveBeenCalled();
    expect(mockCheckIpRateLimit).not.toHaveBeenCalled();
  });

  it("counts a FAILED login (wrong password) against the 'login' scope", async () => {
    mockBcryptCompare.mockResolvedValue(false);
    const authorize = await getAuthorize();

    const result = await authorize(CREDS, REQ);

    expect(result).toBeNull();
    expect(mockCheckIpRateLimit).toHaveBeenCalledWith(expect.any(String), "login");
    expect(mockCheckIpRateLimit).not.toHaveBeenCalledWith(expect.any(String), "login_success");
  });

  it("counts a SUCCESSFUL login against 'login_success' and never against 'login'", async () => {
    const authorize = await getAuthorize();

    const result = await authorize(CREDS, REQ);

    expect(result).not.toBeNull();
    expect(result.id).toBe("user-1");
    expect(mockCheckIpRateLimit).toHaveBeenCalledWith(expect.any(String), "login_success");
    expect(mockCheckIpRateLimit).not.toHaveBeenCalledWith(expect.any(String), "login");
  });

  it("cuts off a valid login once over the successful-login ceiling", async () => {
    mockCheckIpRateLimit.mockResolvedValue(DENIED); // login_success over cap
    const authorize = await getAuthorize();

    const result = await authorize(CREDS, REQ);

    expect(result).toBeNull(); // correct password, but abuse ceiling reached
  });
});
