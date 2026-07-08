import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock data shared between tests ──────────────────────────────────────
let builderResult: unknown = [];

const { mockQueryBuilder, mockTxSelect } = vi.hoisted(() => {
  const builder = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    // Drizzle query builders are thenable — await tx.select()... resolves
    // to the result array.
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(builderResult).then(resolve),
    catch: (reject: (reason: unknown) => unknown) =>
      Promise.resolve(builderResult).catch(reject),
  };

  builder.from.mockReturnThis();
  builder.leftJoin.mockReturnThis();
  builder.where.mockReturnThis();
  builder.orderBy.mockReturnThis();
  builder.limit.mockReturnThis();

  const mTxSelect = vi.fn().mockReturnValue(builder);
  return { mockQueryBuilder: builder, mockTxSelect: mTxSelect };
});

// ── Mock AuthenticatedContext ───────────────────────────────────────────
function createMockAuthCtx() {
  const withTransaction = vi
    .fn()
    .mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
        const mockTx = {
          select: mockTxSelect,
        };
        return fn(mockTx);
      },
    );

  const getTenantId = vi.fn().mockReturnValue("00000000-0000-0000-0000-000000000001");

  return {
    ctx: {
      withTransaction,
      userId: "00000000-0000-0000-0000-000000000010",
      getTenantId,
      role: "ADMIN" as const,
    },
  };
}

import { DashboardRepository } from "@/infrastructure/db/repositories/dashboard.repository";

describe("DashboardRepository", () => {
  let repository: DashboardRepository;
  let mockCtx: ReturnType<typeof createMockAuthCtx>["ctx"];

  beforeEach(() => {
    vi.clearAllMocks();
    builderResult = [];
    mockCtx = createMockAuthCtx().ctx;
    repository = new DashboardRepository(mockCtx as never);
  });

  describe("constructor", () => {
    it("stores the injected AuthenticatedContext", () => {
      expect(repository).toBeDefined();
      expect(mockCtx.withTransaction).not.toHaveBeenCalled();
    });
  });

  describe("getUnreadLeadsCount", () => {
    it("calls withTransaction and returns the count from the database", async () => {
      builderResult = [{ count: "5" }];

      const result = await repository.getUnreadLeadsCount();

      expect(result).toBe(5);
      expect(mockCtx.withTransaction).toHaveBeenCalledTimes(1);
      expect(mockTxSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it("returns 0 when there are no unread leads", async () => {
      builderResult = [{ count: "0" }];

      const result = await repository.getUnreadLeadsCount();

      expect(result).toBe(0);
    });

    it("returns 0 when the database returns empty array", async () => {
      builderResult = [{ count: "0" }];

      const result = await repository.getUnreadLeadsCount();

      expect(result).toBe(0);
    });

    it("executes the query inside the withTransaction callback", async () => {
      const capturedCallback = vi.fn();
      mockCtx.withTransaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        capturedCallback();
        builderResult = [{ count: "3" }];
        const mockTx = { select: mockTxSelect };
        return fn(mockTx);
      });

      const result = await repository.getUnreadLeadsCount();

      expect(result).toBe(3);
      expect(capturedCallback).toHaveBeenCalledOnce();
    });
  });

  describe("getRecentPromociones", () => {
    const mockPromociones = [
      {
        id: "p1",
        name: "Promocion Alpha",
        status: "PUBLISHED",
        updatedAt: new Date("2026-07-08T10:00:00Z"),
      },
      {
        id: "p2",
        name: "Promocion Beta",
        status: "DRAFT",
        updatedAt: new Date("2026-07-07T10:00:00Z"),
      },
    ];

    it("calls withTransaction and returns promociones sorted by updatedAt desc", async () => {
      builderResult = mockPromociones;

      const result = await repository.getRecentPromociones();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockPromociones[0]);
      expect(mockCtx.withTransaction).toHaveBeenCalledTimes(1);
      expect(mockTxSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalled();
    });

    it("returns empty array when no promociones exist", async () => {
      builderResult = [];

      const result = await repository.getRecentPromociones();

      expect(result).toEqual([]);
    });

    it("respects the limit parameter", async () => {
      builderResult = mockPromociones.slice(0, 1);

      const result = await repository.getRecentPromociones(1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("p1");
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
    });

    it("defaults limit to 5 when not provided", async () => {
      builderResult = mockPromociones;

      const result = await repository.getRecentPromociones();

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it("executes the query inside the withTransaction callback", async () => {
      const capturedCallback = vi.fn();
      mockCtx.withTransaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        capturedCallback();
        builderResult = mockPromociones.slice(0, 1);
        const mockTx = { select: mockTxSelect };
        return fn(mockTx);
      });

      const result = await repository.getRecentPromociones(1);

      expect(result).toHaveLength(1);
      expect(capturedCallback).toHaveBeenCalledOnce();
    });
  });
});
