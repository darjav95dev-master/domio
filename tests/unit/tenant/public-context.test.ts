import { describe, it, expect, beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";

vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

import { db } from "@/infrastructure/db/client";

const transactionMock = vi.mocked(db.transaction);
const publicTenantId = "11111111-1111-1111-1111-111111111111";

describe("PublicContext", () => {
  beforeEach(() => {
    vi.resetModules();
    transactionMock.mockReset();
    process.env.PUBLIC_TENANT_ID = publicTenantId;
  });

  it("resolves tenant id from PUBLIC_TENANT_ID environment variable", async () => {
    const { PublicContext } = await import(
      "@/infrastructure/tenant/PublicContext"
    );
    const ctx = new PublicContext();

    expect(ctx.getTenantId()).toBe(publicTenantId);
  });

  it("has type 'public'", async () => {
    const { PublicContext } = await import(
      "@/infrastructure/tenant/PublicContext"
    );
    const ctx = new PublicContext();

    expect(ctx.type).toBe("public");
  });

  it("has no session user", async () => {
    const { PublicContext } = await import(
      "@/infrastructure/tenant/PublicContext"
    );
    const ctx = new PublicContext();

    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBeNull();
  });

  it("resolveFilters returns { status: 'PUBLISHED' }", async () => {
    const { PublicContext } = await import(
      "@/infrastructure/tenant/PublicContext"
    );
    const ctx = new PublicContext();

    expect(ctx.resolveFilters()).toEqual({ status: "PUBLISHED" });
  });

  it("withTransaction sets SET LOCAL app.current_tenant_id before running callback", async () => {
    const { PublicContext } = await import(
      "@/infrastructure/tenant/PublicContext"
    );
    const ctx = new PublicContext();
    const callback = vi.fn().mockResolvedValue("result");
    const txMock = { execute: vi.fn() };

    transactionMock.mockImplementation(async (fn) => fn(txMock as never));

    const result = await ctx.withTransaction(callback);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txMock.execute).toHaveBeenCalledTimes(1);
    expect(txMock.execute).toHaveBeenCalledWith(
      sql`SET LOCAL app.current_tenant_id = ${publicTenantId}`,
    );
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(txMock);
    expect(result).toBe("result");
  });

  it("rejects when the callback throws", async () => {
    const { PublicContext } = await import(
      "@/infrastructure/tenant/PublicContext"
    );
    const ctx = new PublicContext();
    const error = new Error("transaction failed");
    const callback = vi.fn().mockRejectedValue(error);
    const txMock = { execute: vi.fn() };

    transactionMock.mockImplementation(async (fn) => fn(txMock as never));

    await expect(ctx.withTransaction(callback)).rejects.toThrow(
      "transaction failed",
    );

    expect(txMock.execute).toHaveBeenCalledWith(
      sql`SET LOCAL app.current_tenant_id = ${publicTenantId}`,
    );
  });
});
