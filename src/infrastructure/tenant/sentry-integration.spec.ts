import { describe, it, expect, vi, beforeEach } from "vitest";
import { markSentryInitialized } from "@/infrastructure/observability/sentry.wrapper";

// ─── Mocks (vi.hoisted for variables referenced by vi.mock factories) ───────

const { mockSetTag, mockGetTenantContext } = vi.hoisted(() => ({
  mockSetTag: vi.fn(),
  mockGetTenantContext: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  setTag: mockSetTag,
}));

vi.mock("./context-middleware", () => ({
  getTenantContext: mockGetTenantContext,
}));

// ─── Constants ───────────────────────────────────────────────────────────────

const TEST_TENANT_ID = "tenant-1";
const TEST_USER_ID = "user-1";

// ─── SUT ─────────────────────────────────────────────────────────────────────

const { syncSentryWithTenant } = await import("./sentry-integration");

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("syncSentryWithTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SENTRY_DSN", "https://key@o0.ingest.sentry.io/project");
    markSentryInitialized();
  });

  it("sets tenant_id tag when a TenantContext is active (PublicContext)", async () => {
    const { PublicContext } = await import("./PublicContext");
    mockGetTenantContext.mockReturnValue(new PublicContext());

    syncSentryWithTenant();

    expect(mockSetTag).toHaveBeenCalledWith("tenant_id", expect.any(String));
    expect(mockSetTag).not.toHaveBeenCalledWith("user_id", expect.anything());
    expect(mockSetTag).not.toHaveBeenCalledWith("role", expect.anything());
  });

  it("sets user_id and role tags when AuthenticatedContext is active", async () => {
    const { AuthenticatedContext } = await import("./AuthenticatedContext");
    const ctx = new AuthenticatedContext(TEST_TENANT_ID, TEST_USER_ID, "ADMIN");
    mockGetTenantContext.mockReturnValue(ctx);

    syncSentryWithTenant();

    expect(mockSetTag).toHaveBeenCalledWith("tenant_id", TEST_TENANT_ID);
    expect(mockSetTag).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    expect(mockSetTag).toHaveBeenCalledWith("role", "ADMIN");
  });

  it("is no-op when no TenantContext is active", () => {
    mockGetTenantContext.mockReturnValue(undefined);

    syncSentryWithTenant();

    expect(mockSetTag).not.toHaveBeenCalled();
  });

  it("omits user_id/role for non-authenticated contexts (ApiKeyContext)", async () => {
    const { ApiKeyContext } = await import("./ApiKeyContext");
    mockGetTenantContext.mockReturnValue(new ApiKeyContext(TEST_TENANT_ID, "apikey-1"));

    syncSentryWithTenant();

    expect(mockSetTag).toHaveBeenCalledWith("tenant_id", TEST_TENANT_ID);
    expect(mockSetTag).not.toHaveBeenCalledWith("user_id", expect.anything());
    expect(mockSetTag).not.toHaveBeenCalledWith("role", expect.anything());
  });
});
