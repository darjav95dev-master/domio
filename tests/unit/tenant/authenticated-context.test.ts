import { describe, it, expect, beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";

vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

import { db } from "@/infrastructure/db/client";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";

const transactionMock = vi.mocked(db.transaction);

describe("AuthenticatedContext", () => {
  beforeEach(() => {
    transactionMock.mockReset();
  });

  it("extracts tenant_id, user_id and role from session", () => {
    const tenantId = "11111111-1111-1111-1111-111111111111";
    const userId = "22222222-2222-2222-2222-222222222222";
    const role = "ADMIN" as const;

    const ctx = new AuthenticatedContext(tenantId, userId, role);

    expect(ctx.getTenantId()).toBe(tenantId);
    expect(ctx.type).toBe("authenticated");
    expect(ctx.userId).toBe(userId);
    expect(ctx.role).toBe(role);
  });

  it("sets both SET LOCAL app.current_tenant_id and SET LOCAL app.current_user_id inside the transaction", async () => {
    const tenantId = "33333333-3333-3333-3333-333333333333";
    const userId = "44444444-4444-4444-4444-444444444444";
    const ctx = new AuthenticatedContext(tenantId, userId, "OPERATOR");
    const callback = vi.fn().mockResolvedValue("result");
    const txMock = { execute: vi.fn() };

    transactionMock.mockImplementation(async (fn) => fn(txMock as never));

    const result = await ctx.withTransaction(callback);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txMock.execute).toHaveBeenCalledTimes(2);
    expect(txMock.execute).toHaveBeenNthCalledWith(
      1,
      sql`SET LOCAL app.current_tenant_id = ${tenantId}`,
    );
    expect(txMock.execute).toHaveBeenNthCalledWith(
      2,
      sql`SET LOCAL app.current_user_id = ${userId}`,
    );
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(txMock);
    expect(result).toBe("result");
  });

  it("resolveFilters returns an empty object", () => {
    const ctx = new AuthenticatedContext(
      "55555555-5555-5555-5555-555555555555",
      "66666666-6666-6666-6666-666666666666",
      "AGENT",
    );

    expect(ctx.resolveFilters()).toEqual({});
  });

  it("rejects when the callback throws after setting both variables", async () => {
    const tenantId = "77777777-7777-7777-7777-777777777777";
    const userId = "88888888-8888-8888-8888-888888888888";
    const ctx = new AuthenticatedContext(tenantId, userId, "ADMIN");
    const error = new Error("transaction failed");
    const callback = vi.fn().mockRejectedValue(error);
    const txMock = { execute: vi.fn() };

    transactionMock.mockImplementation(async (fn) => fn(txMock as never));

    await expect(ctx.withTransaction(callback)).rejects.toThrow(
      "transaction failed",
    );

    expect(txMock.execute).toHaveBeenCalledTimes(2);
    expect(txMock.execute).toHaveBeenNthCalledWith(
      1,
      sql`SET LOCAL app.current_tenant_id = ${tenantId}`,
    );
    expect(txMock.execute).toHaveBeenNthCalledWith(
      2,
      sql`SET LOCAL app.current_user_id = ${userId}`,
    );
  });
});
