import { describe, it, expect, beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";

vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

import { db } from "@/infrastructure/db/client";
import { TenantContext } from "@/infrastructure/tenant/TenantContext";

const transactionMock = vi.mocked(db.transaction);

class TestContext extends TenantContext {
  readonly type = "public" as const;
}

describe("TenantContext", () => {
  beforeEach(() => {
    transactionMock.mockReset();
  });

  it("exposes the tenant id", () => {
    const tenantId = "00000000-0000-0000-0000-000000000000";
    const ctx = new TestContext(tenantId);

    expect(ctx.getTenantId()).toBe(tenantId);
  });

  it("opens a transaction and executes set_config for app.current_tenant_id first", async () => {
    const tenantId = "11111111-1111-1111-1111-111111111111";
    const ctx = new TestContext(tenantId);
    const callback = vi.fn().mockResolvedValue("result");
    const txMock = { execute: vi.fn() };

    transactionMock.mockImplementation(async (fn) => fn(txMock as never));

    const result = await ctx.withTransaction(callback);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txMock.execute).toHaveBeenCalledTimes(1);
    expect(txMock.execute).toHaveBeenCalledWith(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
    );
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(txMock);
    expect(result).toBe("result");
  });

  it("rejects when the callback throws", async () => {
    const tenantId = "22222222-2222-2222-2222-222222222222";
    const ctx = new TestContext(tenantId);
    const error = new Error("transaction failed");
    const callback = vi.fn().mockRejectedValue(error);
    const txMock = { execute: vi.fn() };

    transactionMock.mockImplementation(async (fn) => fn(txMock as never));

    await expect(ctx.withTransaction(callback)).rejects.toThrow(
      "transaction failed",
    );

    expect(txMock.execute).toHaveBeenCalledWith(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
    );
  });
});
