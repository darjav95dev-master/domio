import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRelatedPropertiesService } from "./get-related-properties";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import type { Transaction } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROMOCION_ID = "promo-1";
const LOCATION: [number, number] = [-16.5, 28.1];

const mockCurrentPromocion = {
  id: PROMOCION_ID,
  propertyType: "piso",
  location: LOCATION,
};

const mockRelatedRow = {
  id: "related-1",
  slug: "piso-en-venta-en-santa-cruz",
  name: "Piso en Santa Cruz",
  propertyType: "piso",
  referencePriceSale: 200000,
  usefulArea: 85,
  municipality: "Santa Cruz",
  coverUrl: null,
};

const mockRelatedRow2 = {
  id: "related-2",
  slug: "piso-en-venta-en-la-laguna",
  name: "Piso en La Laguna",
  propertyType: "piso",
  referencePriceSale: 220000,
  usefulArea: 90,
  municipality: "La Laguna",
  coverUrl: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSequenceTx(returns: unknown[]) {
  let index = 0;

  function nextReturn() {
    const data = returns[index] ?? [];
    index = (index + 1) % returns.length;
    return data;
  }

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
  ) as Transaction;
}

function createMockCtx(returns: unknown[]) {
  const ctx = new PublicContext();
  const mockWithTx = vi.fn();
  mockWithTx.mockImplementation(
    <T>(fn: (tx: Transaction) => Promise<T>): Promise<T> =>
      fn(createSequenceTx(returns)),
  );
  ctx.withTransaction = mockWithTx as PublicContext["withTransaction"];
  return ctx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getRelatedPropertiesService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns related properties based on location, type, and price", async () => {
    const ctx = createMockCtx([
      // First query: current promocion + its tipologias
      [{
        ...mockCurrentPromocion,
        // Include min price from tipologia
        minPrice: 200000,
      }],
      // Second query: related properties
      [mockRelatedRow, mockRelatedRow2],
    ]);

    const result = await getRelatedPropertiesService(
      ctx,
      PROMOCION_ID,
      LOCATION,
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("related-1");
    expect(result[1]?.id).toBe("related-2");
  });

  it("limits results to 4 (SQL LIMIT 4)", async () => {
    const fourRelated = Array.from({ length: 4 }, (_, i) => ({
      ...mockRelatedRow,
      id: `related-${i + 1}`,
    }));

    const ctx = createMockCtx([
      [{ ...mockCurrentPromocion, minPrice: 200000 }],
      fourRelated,
    ]);

    const result = await getRelatedPropertiesService(
      ctx,
      PROMOCION_ID,
      LOCATION,
    );

    // SQL LIMIT 4 is responsible for capping at 4 rows;
    // this test verifies the full pipeline returns up to 4
    expect(result.length).toBeLessThanOrEqual(4);
    expect(result).toHaveLength(4);
  });

  it("returns empty array when no related properties found", async () => {
    const ctx = createMockCtx([
      [{ ...mockCurrentPromocion, minPrice: 200000 }],
      [],
    ]);

    const result = await getRelatedPropertiesService(
      ctx,
      PROMOCION_ID,
      LOCATION,
    );

    expect(result).toHaveLength(0);
  });

  it("includes slug, name, propertyType, price, area, and imageUrl in results", async () => {
    const ctx = createMockCtx([
      [{ ...mockCurrentPromocion, minPrice: 200000 }],
      [mockRelatedRow],
    ]);

    const result = await getRelatedPropertiesService(
      ctx,
      PROMOCION_ID,
      LOCATION,
    );

    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("slug");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("propertyType");
    expect(result[0]).toHaveProperty("price");
    expect(result[0]).toHaveProperty("area");
    expect(result[0]).toHaveProperty("imageUrl");
  });
});
