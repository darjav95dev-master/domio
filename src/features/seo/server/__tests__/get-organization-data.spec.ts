import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrganizationData } from "../get-organization-data";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock schema so the imports resolve in test isolation
vi.mock("@/infrastructure/db/schema", () => ({
  tenants: { id: "id", name: "name", config: "config" },
  contactConfig: {
    tenantId: "tenantId",
    phone: "phone",
    email: "email",
    address: "address",
  },
}));

// Mock drizzle-orm eq to be a pass-through identity
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((a: unknown, b: unknown) => ({ field: a, value: b })),
  };
});

// Shared mutable mock that tests can reconfigure before calling without ctx.
// The default returns no rows so that tests which don't care about the
// default-ctx path get a clean fallback.
const defaultMockWithTx = vi.fn();
vi.mock("@/infrastructure/tenant/PublicContext", () => ({
  PublicContext: vi.fn(() => ({
    getTenantId: vi.fn().mockReturnValue("default-tenant-id"),
    withTransaction: defaultMockWithTx,
  })),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = "t-00000000-0000-0000-0000-000000000001";

const TENANT_FIXTURE = {
  name: "Domio Inmobiliaria",
  config: {
    logo: "https://domio.test/logo.png",
    defaultOgImage: "https://domio.test/og-default.jpg",
  },
};

const CONTACT_FIXTURE = {
  phone: "+34 912 345 678",
  email: "info@domio.test",
  address: "Calle de Ejemplo 123, 28001 Madrid",
};

// ---------------------------------------------------------------------------
// Helpers: chainable transaction mock (Proxy-based)
// ---------------------------------------------------------------------------

function createSequenceTx(returns: unknown[]) {
  let index = 0;

  function nextReturn() {
    const data = returns[index] ?? [];
    index = (index + 1) % returns.length;
    return data;
  }

  // A thenable that resolves to the given value
  const chainable = (resolveValue: unknown) => {
    const builder: Record<string, unknown> = {
      then(resolve: (v: unknown) => void) {
        return Promise.resolve(resolveValue).then(resolve);
      },
      catch() {
        /* noop */
      },
      finally(cb: () => void) {
        cb();
      },
    };

    return new Proxy(builder, {
      get(target, prop: string | symbol) {
        if (prop === "then" || prop === "catch" || prop === "finally") {
          return target[prop];
        }
        if (typeof prop === "string") {
          return () => chainable(resolveValue);
        }
        return undefined;
      },
    });
  };

  return new Proxy(
    {},
    {
      get(_target, prop: string | symbol) {
        if (typeof prop === "string") {
          return () => chainable(nextReturn());
        }
        return undefined;
      },
    },
  );
}

function createMockCtx(returns: unknown[]) {
  const mockWithTx = vi.fn();
  mockWithTx.mockImplementation(
    <T>(fn: (tx: unknown) => Promise<T>): Promise<T> =>
      fn(createSequenceTx(returns)),
  );
  return {
    getTenantId: vi.fn().mockReturnValue(TENANT_ID),
    withTransaction: mockWithTx,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getOrganizationData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tenant and contact when both exist", async () => {
    const ctx = createMockCtx([[TENANT_FIXTURE], [CONTACT_FIXTURE]]);

    const result = await getOrganizationData(ctx as never);

    expect(result.tenant).toEqual(TENANT_FIXTURE);
    expect(result.contact).toEqual(CONTACT_FIXTURE);
    expect(ctx.getTenantId).toHaveBeenCalled();
    expect(ctx.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("returns tenant as null and contact as null when no rows found", async () => {
    const ctx = createMockCtx([[], []]);

    const result = await getOrganizationData(ctx as never);

    expect(result.tenant).toBeNull();
    expect(result.contact).toBeNull();
    expect(ctx.getTenantId).toHaveBeenCalled();
    expect(ctx.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("returns tenant populated and contact as null when contact has no rows", async () => {
    const ctx = createMockCtx([[TENANT_FIXTURE], []]);

    const result = await getOrganizationData(ctx as never);

    expect(result.tenant).toEqual(TENANT_FIXTURE);
    expect(result.contact).toBeNull();
    expect(ctx.getTenantId).toHaveBeenCalled();
    expect(ctx.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("returns tenant as null when tenant has no rows even if contact exists", async () => {
    const ctx = createMockCtx([[], [CONTACT_FIXTURE]]);

    const result = await getOrganizationData(ctx as never);

    expect(result.tenant).toBeNull();
    expect(result.contact).toEqual(CONTACT_FIXTURE);
    expect(ctx.getTenantId).toHaveBeenCalled();
    expect(ctx.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("uses PublicContext as default when no context is passed", async () => {
    defaultMockWithTx.mockImplementation(
      <T>(fn: (tx: unknown) => Promise<T>): Promise<T> =>
        fn(createSequenceTx([[TENANT_FIXTURE], [CONTACT_FIXTURE]])),
    );

    const result = await getOrganizationData();

    expect(result.tenant).toEqual(TENANT_FIXTURE);
    expect(result.contact).toEqual(CONTACT_FIXTURE);
  });

  it("returns tenant with config as null when config is not set", async () => {
    const tenantNoConfig = { name: "Domio", config: null };
    const ctx = createMockCtx([[tenantNoConfig], [CONTACT_FIXTURE]]);

    const result = await getOrganizationData(ctx as never);

    expect(result.tenant).toEqual(tenantNoConfig);
    expect(result.tenant!.config).toBeNull();
  });
});
