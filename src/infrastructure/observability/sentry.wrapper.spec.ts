import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Constants ───────────────────────────────────────────────────────────────
const FILTERED = "[FILTERED]";
const TEST_DSN = "https://key@o0.ingest.sentry.io/project";
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const ERR_MSG = "test error";

// ─── Sentry mocks ────────────────────────────────────────────────────────────
const mockCaptureException = vi.fn();
const mockSetTag = vi.fn();
const mockAddBreadcrumb = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
  setTag: mockSetTag,
  addBreadcrumb: mockAddBreadcrumb,
}));

// SUT — import after mocks are set up
const {
  captureError,
  setTenantContext,
  addBreadcrumb,
  sanitizeEvent,
} = await import("./sentry.wrapper");

// ─── Helpers ─────────────────────────────────────────────────────────────────
function asRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object") return value as Record<string, unknown>;
  return undefined;
}

// ─── captureError ─────────────────────────────────────────────────────────────
describe("captureError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SENTRY_DSN", TEST_DSN);
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
  });

  it("calls Sentry.captureException with the error", () => {
    const error = new Error(ERR_MSG);
    captureError(error);
    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it("injects tenant_id, user_id, role, endpoint as tags when context is provided", () => {
    const error = new Error(ERR_MSG);
    captureError(error, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      role: "ADMIN",
      endpoint: "/api/v1/promociones",
    });

    expect(mockSetTag).toHaveBeenCalledWith("tenant_id", TENANT_ID);
    expect(mockSetTag).toHaveBeenCalledWith("user_id", USER_ID);
    expect(mockSetTag).toHaveBeenCalledWith("role", "ADMIN");
    expect(mockSetTag).toHaveBeenCalledWith("endpoint", "/api/v1/promociones");
    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it("is no-op when no Sentry DSN is configured (SENTRY_DSN empty)", () => {
    vi.stubEnv("SENTRY_DSN", "");
    captureError(new Error(ERR_MSG), { tenantId: TENANT_ID });
    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockSetTag).not.toHaveBeenCalled();
  });

  it("is no-op when both DSN env vars are empty", () => {
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    captureError(new Error(ERR_MSG));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("works with NEXT_PUBLIC_SENTRY_DSN when SENTRY_DSN is not set", () => {
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", TEST_DSN);
    captureError(new Error(ERR_MSG));
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it("does not set empty or undefined context fields as tags", () => {
    captureError(new Error(ERR_MSG), { tenantId: TENANT_ID });
    expect(mockSetTag).toHaveBeenCalledWith("tenant_id", TENANT_ID);
    expect(mockSetTag).toHaveBeenCalledTimes(1);
  });
});

// ─── setTenantContext ─────────────────────────────────────────────────────────
describe("setTenantContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SENTRY_DSN", TEST_DSN);
  });

  it("sets tenant_id, user_id, role tags via Sentry.setTag", () => {
    setTenantContext({
      tenantId: TENANT_ID,
      userId: USER_ID,
      role: "OPERATOR",
      endpoint: "/api/v1/leads",
    });

    expect(mockSetTag).toHaveBeenCalledWith("tenant_id", TENANT_ID);
    expect(mockSetTag).toHaveBeenCalledWith("user_id", USER_ID);
    expect(mockSetTag).toHaveBeenCalledWith("role", "OPERATOR");
    expect(mockSetTag).toHaveBeenCalledWith("endpoint", "/api/v1/leads");
  });

  it("is no-op when DSN is not configured", () => {
    vi.stubEnv("SENTRY_DSN", "");
    setTenantContext({ tenantId: TENANT_ID });
    expect(mockSetTag).not.toHaveBeenCalled();
  });
});

// ─── addBreadcrumb ────────────────────────────────────────────────────────────
describe("addBreadcrumb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SENTRY_DSN", TEST_DSN);
  });

  it("adds breadcrumb with message and data", () => {
    addBreadcrumb("User logged in", { userId: USER_ID });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      message: "User logged in",
      data: { userId: USER_ID },
    });
  });

  it("adds breadcrumb with message only", () => {
    addBreadcrumb("Request started");
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      message: "Request started",
      data: undefined,
    });
  });

  it("is no-op when DSN is not configured", () => {
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    addBreadcrumb("test");
    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });
});

// ─── sanitizeEvent ────────────────────────────────────────────────────────────
describe("sanitizeEvent", () => {
  it("filters password key from event extra data", () => {
    const secretValue = "supersecret";
    const result = sanitizeEvent({
      extra: { password: secretValue, normalField: "hello" },
    });
    const extra = asRecord(result.extra);
    expect(extra?.password).toBe(FILTERED);
    expect(extra?.normalField).toBe("hello");
  });

  it("filters api_key and authorization keys case-insensitively", () => {
    const result = sanitizeEvent({
      extra: {
        API_KEY: "sk-123",
        Authorization: "Bearer token",
        api_key: "test-key",
      },
    });
    const extra = asRecord(result.extra);
    expect(extra?.API_KEY).toBe(FILTERED);
    expect(extra?.Authorization).toBe(FILTERED);
    expect(extra?.api_key).toBe(FILTERED);
  });

  it("filters nested secrets recursively", () => {
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test data, not real password
    const pwd = "secret123";
    const result = sanitizeEvent({
      contexts: {
        response: {
          headers: {
            authorization: "Bearer tok",
            "content-type": "application/json",
          },
        },
        user: { email: "user@example.com", password: pwd },
      },
    });
    const contexts = asRecord(result.contexts);
    const response = asRecord(contexts?.response);
    const headers = asRecord(response?.headers);
    const user = asRecord(contexts?.user);

    expect(headers?.authorization).toBe(FILTERED);
    expect(headers?.["content-type"]).toBe("application/json");
    expect(user?.password).toBe(FILTERED);
    expect(user?.email).toBe("user@example.com");
  });

  it("filters secret, token, cookie, credit keys", () => {
    const result = sanitizeEvent({
      extra: {
        secret_key: "abc",
        auth_token: "xyz",
        session_cookie: "sess",
        credit_card: "4111",
      },
    });
    const extra = asRecord(result.extra);
    expect(extra?.secret_key).toBe(FILTERED);
    expect(extra?.auth_token).toBe(FILTERED);
    expect(extra?.session_cookie).toBe(FILTERED);
    expect(extra?.credit_card).toBe(FILTERED);
  });

  it("does NOT filter tenant_id", () => {
    const result = sanitizeEvent({
      tags: { tenant_id: TENANT_ID, user_id: USER_ID },
    });
    const tags = asRecord(result.tags);
    expect(tags?.tenant_id).toBe(TENANT_ID);
    expect(tags?.user_id).toBe(USER_ID);
  });

  it("handles empty event without crashing", () => {
    expect(sanitizeEvent({})).toEqual({});
  });

  it("handles null/undefined values without crashing", () => {
    const result = sanitizeEvent({
      extra: { password: null, normal: undefined },
    });
    const extra = asRecord(result.extra);
    expect(extra?.password).toBe(FILTERED);
  });

  it("filters secrets in breadcrumbs data", () => {
    const result = sanitizeEvent({
      breadcrumbs: [
        {
          message: "API call",
          data: { api_key: "sk-123", url: "https://api.example.com" },
        },
      ],
    });
    const breadcrumbs = result.breadcrumbs as Array<Record<string, unknown>> | undefined;
    const breadcrumb = breadcrumbs?.[0] as Record<string, unknown> | undefined;
    const data = asRecord(breadcrumb?.data);

    expect(data?.api_key).toBe(FILTERED);
    expect(data?.url).toBe("https://api.example.com");
  });
});
