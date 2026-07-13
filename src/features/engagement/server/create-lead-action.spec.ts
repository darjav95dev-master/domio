import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLeadService, type CreateLeadInput } from "./create-lead-action";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import type { Transaction } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = "tenant-1";
const PROMOCION_ID = "550e8400-e29b-41d4-a716-446655440000";
const AGENT_ID = "agent-1";
const TEST_IP = "203.0.113.42";

const validInput: CreateLeadInput = {
  promocionId: PROMOCION_ID,
  name: "Juan Pérez",
  email: "juan@example.com",
  phone: "+34 612 345 678",
  message: "Me interesa esta promoción, quisiera más información.",
  tipologiaId: "550e8400-e29b-41d4-a716-446655440000",
  consent: true,
};

const mockPromocionRow = {
  id: PROMOCION_ID,
  name: "Residencial Las Américas",
  assignedAgentId: AGENT_ID,
};

const mockAgentRow = {
  id: AGENT_ID,
  name: "María López",
  email: "maria@wedomio.com",
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

describe("createLeadService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates lead, consent record, and enqueues emails successfully", async () => {
    const ctx = createMockCtx([
      // select promocion -> row
      [mockPromocionRow],
      // select user (agent) -> row
      [mockAgentRow],
      // insert lead returning -> lead id
      [{ id: "lead-1", tenantId: TENANT_ID }],
      // insert consent record returning
      [{ id: "consent-1" }],
      // insert confirmation email returning
      [{ id: "email-1" }],
      // insert agent email returning
      [{ id: "email-2" }],
    ]);

    const result = await createLeadService(
      ctx,
      validInput,
      PROMOCION_ID,
      TEST_IP,
    );

    expect(result.success).toBe(true);
  });

  it("returns success message on successful creation", async () => {
    const ctx = createMockCtx([
      [mockPromocionRow],
      [mockAgentRow],
      [{ id: "lead-1" }],
      [{ id: "consent-1" }],
      [{ id: "email-1" }],
      [{ id: "email-2" }],
    ]);

    const result = await createLeadService(
      ctx,
      validInput,
      PROMOCION_ID,
      TEST_IP,
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("recibida");
  });

  it("returns error when promocion is not found", async () => {
    const ctx = createMockCtx([[]]);

    const result = await createLeadService(
      ctx,
      validInput,
      PROMOCION_ID,
      TEST_IP,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error when promocion has no assigned agent", async () => {
    const promoWithoutAgent = { ...mockPromocionRow, assignedAgentId: null };
    const ctx = createMockCtx([[promoWithoutAgent]]);

    const result = await createLeadService(
      ctx,
      validInput,
      PROMOCION_ID,
      TEST_IP,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("agente");
  });

  it("returns error when lead insertion fails", async () => {
    const ctx = createMockCtx([
      [mockPromocionRow],
      [mockAgentRow],
      // lead insert returns empty -> failure
      [],
    ]);

    const result = await createLeadService(
      ctx,
      validInput,
      PROMOCION_ID,
      TEST_IP,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
