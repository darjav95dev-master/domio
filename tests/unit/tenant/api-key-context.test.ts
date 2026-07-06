import { describe, it, expect, beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";

vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

import { db } from "@/infrastructure/db/client";
import { ApiKeyContext } from "@/infrastructure/tenant/ApiKeyContext";

const transactionMock = vi.mocked(db.transaction);

const tenantId = "33333333-3333-3333-3333-333333333333";
const apiKeyId = "44444444-4444-4444-4444-444444444444";

const expectedKind = "portfolio";
const expectedStatus = "PUBLISHED";

describe("ApiKeyContext", () => {
  beforeEach(() => {
    transactionMock.mockReset();
  });

  it("resolves as an apikey context with the tenant and api key ids", () => {
    const ctx = new ApiKeyContext(tenantId, apiKeyId);

    expect(ctx.type).toBe("apikey");
    expect(ctx.getTenantId()).toBe(tenantId);
    expect(ctx.apiKeyId).toBe(apiKeyId);
  });

  it("applies the mandatory catalog filters", () => {
    const ctx = new ApiKeyContext(tenantId, apiKeyId);

    expect(ctx.resolveFilters()).toEqual({
      kind: expectedKind,
      status: expectedStatus,
    });
  });

  it("does not allow consumers to override the mandatory filters", () => {
    const ctx = new ApiKeyContext(tenantId, apiKeyId);
    const consumerAttempt = {
      kind: "external",
      status: "DRAFT",
      operation: "SALE",
    };

    const merged = { ...consumerAttempt, ...ctx.resolveFilters() };

    expect(merged).toEqual({
      kind: expectedKind,
      status: expectedStatus,
      operation: "SALE",
    });
  });

  it("sets SET LOCAL app.current_tenant_id inside a transaction", async () => {
    const ctx = new ApiKeyContext(tenantId, apiKeyId);
    const callback = vi.fn().mockResolvedValue("result");
    const txMock = { execute: vi.fn() };

    transactionMock.mockImplementation(async (fn) => fn(txMock as never));

    const result = await ctx.withTransaction(callback);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txMock.execute).toHaveBeenCalledTimes(1);
    expect(txMock.execute).toHaveBeenCalledWith(
      sql`SET LOCAL app.current_tenant_id = ${tenantId}`,
    );
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(txMock);
    expect(result).toBe("result");
  });
});
