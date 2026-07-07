import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PUBLIC_HOST,
  AUTH_HOST,
  API_V1_PREFIX,
  API_KEY_HEADER,
} from "@/shared/constants/tenant-hosts";
import { USER_ROLES } from "@/shared/constants/db-enums";

vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

const publicTenantId = "11111111-1111-1111-1111-111111111111";
const validApiKey = "valid-api-key";
const mockSessionHeader = "x-mock-session";
const validMockSession = "valid-mock-session";

function createRequest({
  host,
  pathname = "/",
  headers = {},
}: {
  host: string;
  pathname?: string;
  headers?: Record<string, string>;
}): {
  host: string;
  pathname: string;
  headers: { get: (name: string) => string | null };
} {
  return {
    host,
    pathname,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  };
}

describe("context-middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    // stubEnv + unstubEnvs (vitest.config) restauran tras cada test: con
    // singleFork, un NODE_ENV mutado contamina el require cache de React
    // de todos los archivos posteriores (jsxDEV is not a function).
    vi.stubEnv("PUBLIC_TENANT_ID", publicTenantId);
    vi.stubEnv("NODE_ENV", "development");
  });

  it(`resolves ${PUBLIC_HOST} to a PublicContext`, async () => {
    const { resolveTenantContext } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    const ctx = resolveTenantContext(createRequest({ host: PUBLIC_HOST }));

    expect(ctx.type).toBe("public");
    expect(ctx.getTenantId()).toBe(publicTenantId);
    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBeNull();
  });

  it(`resolves ${AUTH_HOST} with a mock session to an AuthenticatedContext`, async () => {
    const { resolveTenantContext } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    const ctx = resolveTenantContext(
      createRequest({
        host: AUTH_HOST,
        headers: { [mockSessionHeader]: validMockSession },
      }),
    );

    expect(ctx.type).toBe("authenticated");
    expect(ctx.getTenantId()).toBe(publicTenantId);
    expect(ctx.userId).toBeDefined();
    expect(ctx.role).toBe(USER_ROLES[0]);
  });

  it(`rejects ${AUTH_HOST} mock session authentication outside development`, async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { resolveTenantContext, ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    expect(() =>
      resolveTenantContext(
        createRequest({
          host: AUTH_HOST,
          headers: { [mockSessionHeader]: validMockSession },
        }),
      ),
    ).toThrow(
      new ContextResolutionError(
        "AuthenticatedContext mock session is only available in development",
        500,
      ),
    );
  });

  it(`rejects ${AUTH_HOST} without a mock session with 401`, async () => {
    const { resolveTenantContext, ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    expect(() =>
      resolveTenantContext(createRequest({ host: AUTH_HOST })),
    ).toThrow(
      new ContextResolutionError(
        `Missing or invalid session for ${AUTH_HOST}`,
        401,
      ),
    );
  });

  it("resolves /api/v1/* with an API key to an ApiKeyContext", async () => {
    const { resolveTenantContext } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    const ctx = resolveTenantContext(
      createRequest({
        host: PUBLIC_HOST,
        pathname: `${API_V1_PREFIX}promociones`,
        headers: { [API_KEY_HEADER]: validApiKey },
      }),
    );

    expect(ctx.type).toBe("apikey");
    expect(ctx.getTenantId()).toBe(publicTenantId);
    expect(ctx.resolveFilters()).toEqual({
      kind: "portfolio",
      status: "PUBLISHED",
    });
  });

  it("prioritises /api/v1/* over host when resolving an ApiKeyContext", async () => {
    const { resolveTenantContext } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    const ctx = resolveTenantContext(
      createRequest({
        host: AUTH_HOST,
        pathname: `${API_V1_PREFIX}leads`,
        headers: { authorization: `Bearer ${validApiKey}` },
      }),
    );

    expect(ctx.type).toBe("apikey");
  });

  it("rejects /api/v1/* mock API key lookup outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { resolveTenantContext, ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    expect(() =>
      resolveTenantContext(
        createRequest({
          host: PUBLIC_HOST,
          pathname: `${API_V1_PREFIX}promociones`,
          headers: { [API_KEY_HEADER]: validApiKey },
        }),
      ),
    ).toThrow(
      new ContextResolutionError(
        "ApiKeyContext mock key lookup is only available in development",
        500,
      ),
    );
  });

  it("rejects /api/v1/* without an API key with 401", async () => {
    const { resolveTenantContext, ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    expect(() =>
      resolveTenantContext(
        createRequest({
          host: PUBLIC_HOST,
          pathname: `${API_V1_PREFIX}promociones`,
        }),
      ),
    ).toThrow(
      new ContextResolutionError("Missing or invalid API key", 401),
    );
  });

  it("rejects an unknown host", async () => {
    const { resolveTenantContext, ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    expect(() =>
      resolveTenantContext(createRequest({ host: "evil.com" })),
    ).toThrow(
      new ContextResolutionError(
        "Unable to resolve tenant context for host: evil.com",
        400,
      ),
    );
  });

  it("stores and exposes the resolved context via AsyncLocalStorage", async () => {
    const {
      resolveTenantContext,
      tenantContextStorage,
    } = await import("@/infrastructure/tenant/context-middleware");

    const ctx = resolveTenantContext(createRequest({ host: PUBLIC_HOST }));

    await tenantContextStorage.run(ctx, async () => {
      expect(tenantContextStorage.getStore()).toBe(ctx);
    });
  });

  it("getTenantContext returns undefined outside a storage run", async () => {
    const { getTenantContext } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    expect(getTenantContext()).toBeUndefined();
  });

  it("getTenantContext returns the context inside a storage run", async () => {
    const {
      resolveTenantContext,
      tenantContextStorage,
      getTenantContext,
    } = await import("@/infrastructure/tenant/context-middleware");

    const ctx = resolveTenantContext(createRequest({ host: PUBLIC_HOST }));

    await tenantContextStorage.run(ctx, async () => {
      expect(getTenantContext()).toBe(ctx);
    });
  });

  it("assertDevelopmentOnly does not throw in development", async () => {
    const { assertDevelopmentOnly } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    expect(() => assertDevelopmentOnly("test feature")).not.toThrow();
  });

  it("assertDevelopmentOnly throws outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { assertDevelopmentOnly, ContextResolutionError } = await import(
      "@/infrastructure/tenant/context-middleware"
    );

    expect(() => assertDevelopmentOnly("test feature")).toThrow(
      new ContextResolutionError(
        "test feature is only available in development",
        500,
      ),
    );
  });
});
