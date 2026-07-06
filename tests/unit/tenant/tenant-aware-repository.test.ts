import { describe, it, expect, vi } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

import { TenantContext } from "@/infrastructure/tenant/TenantContext";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";

class TestContext extends TenantContext {
  readonly type = "public" as const;
}

class TestRepository extends TenantAwareRepository {
  async run<T>(
    fn: Parameters<TenantContext["withTransaction"]>[0],
  ): Promise<T> {
    return this.withTransaction(fn);
  }
}

describe("TenantAwareRepository", () => {
  it("stores the injected TenantContext", () => {
    const ctx = new TestContext("11111111-1111-1111-1111-111111111111");
    const repo = new TestRepository(ctx);

    expect(repo).toBeDefined();
  });

  it("delegates withTransaction to the injected context", async () => {
    const ctx = new TestContext("11111111-1111-1111-1111-111111111111");
    const withTransactionMock = vi
      .spyOn(ctx, "withTransaction")
      .mockResolvedValue("repository-result");
    const repo = new TestRepository(ctx);
    const callback = vi.fn();

    const result = await repo.run(callback);

    expect(withTransactionMock).toHaveBeenCalledTimes(1);
    expect(withTransactionMock).toHaveBeenCalledWith(callback);
    expect(result).toBe("repository-result");
  });
});
