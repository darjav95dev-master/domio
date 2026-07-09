import { describe, it, expect, vi, beforeEach } from "vitest";
import { getContactConfigService } from "./get-contact-config";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import type { Transaction } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = "tenant-1";

const mockContactConfig = {
  tenantId: TENANT_ID,
  whatsappNumber: "+34612345678",
  whatsappPrefilledMessage: "Hola, me interesa la promoción",
  phone: "+34922123456",
  email: "info@domio.com",
  address: "Calle Principal 1, Santa Cruz",
  hours: "L-V 9:00-18:00",
  updatedBy: null,
  updatedAt: new Date("2026-07-08"),
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

describe("getContactConfigService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns whatsapp number and prefilled message", async () => {
    const ctx = createMockCtx([[mockContactConfig]]);

    const result = await getContactConfigService(ctx);

    expect(result).toBeDefined();
    expect(result.whatsappNumber).toBe("+34612345678");
    expect(result.whatsappPrefilledMessage).toBe(
      "Hola, me interesa la promoción",
    );
  });

  it("returns null values when contact config does not exist", async () => {
    const ctx = createMockCtx([[]]);

    const result = await getContactConfigService(ctx);

    expect(result.whatsappNumber).toBeNull();
    expect(result.whatsappPrefilledMessage).toBeNull();
  });

  it("returns object with whatsappNumber and whatsappPrefilledMessage keys", async () => {
    const ctx = createMockCtx([[mockContactConfig]]);

    const result = await getContactConfigService(ctx);

    expect(result).toHaveProperty("whatsappNumber");
    expect(result).toHaveProperty("whatsappPrefilledMessage");
  });
});
