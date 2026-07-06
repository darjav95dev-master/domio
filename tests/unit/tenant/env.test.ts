import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("tenant env validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("accepts a valid UUID for PUBLIC_TENANT_ID", async () => {
    process.env.PUBLIC_TENANT_ID = "11111111-1111-1111-1111-111111111111";

    const { tenantEnv } = await import("@/infrastructure/tenant/env");

    expect(tenantEnv.PUBLIC_TENANT_ID).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("throws when PUBLIC_TENANT_ID is missing", async () => {
    delete process.env.PUBLIC_TENANT_ID;

    await expect(import("@/infrastructure/tenant/env")).rejects.toThrow(
      "PUBLIC_TENANT_ID",
    );
  });

  it("throws when PUBLIC_TENANT_ID is not a valid UUID", async () => {
    process.env.PUBLIC_TENANT_ID = "not-a-uuid";

    await expect(import("@/infrastructure/tenant/env")).rejects.toThrow(
      "PUBLIC_TENANT_ID",
    );
  });
});
