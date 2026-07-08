import { vi } from "vitest";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { Transaction } from "@/infrastructure/tenant/TenantContext";

export interface DrizzleCall {
  method: string;
  args: unknown[];
}

/**
 * Creates a mock transaction for repository tests.
 *
 * The mock transaction uses a Proxy where:
 * - Every top-level method call (tx.select, tx.insert, etc.) creates a
 *   chainable QueryBuilder that resolves to the next element in `returnsSequence`
 * - Chained methods (select → from → where → ...) return the SAME QueryBuilder
 *   instance, not a new one
 * - When awaited, the QueryBuilder resolves to its associated data
 *
 * @param returnsSequence - Array of return values, one per top-level query
 */
export function createMockTx(returnsSequence: unknown[]) {
  const calls: DrizzleCall[] = [];
  let seqIndex = 0;

  /**
   * Creates a chainable then-able object that resolves to `resolveValue`.
   * Every method call returns the same Proxy (for chaining).
   */
  function createBuilder(resolveValue: unknown) {
    const builder: Record<string | symbol, unknown> = {
      then(resolve: (value: unknown) => void) {
        return Promise.resolve(resolveValue).then(resolve);
      },
      catch() {
        /* noop */
      },
      finally(cb: () => void) {
        cb();
      },
    };

    const proxy = new Proxy(builder, {
      get(target, prop: string | symbol) {
        if (prop === "then" || prop === "catch" || prop === "finally") {
          return target[prop];
        }
        if (typeof prop === "string") {
          return (...args: unknown[]) => {
            calls.push({ method: prop, args });
            return proxy;
          };
        }
        return undefined;
      },
    });

    return proxy;
  }

  // Top-level tx: each method call gets the next sequence element
  const tx = new Proxy(
    {},
    {
      get(_target, prop: string | symbol) {
        if (typeof prop === "string") {
          return (...args: unknown[]) => {
            calls.push({ method: prop, args });
            const data =
              returnsSequence[seqIndex++ % returnsSequence.length] ?? [];
            return createBuilder(data);
          };
        }
        return undefined;
      },
    },
  );

  return {
    tx: tx as unknown as Transaction,
    calls,
  };
}

/**
 * Creates a mock AuthenticatedContext for repository tests.
 *
 * Uses a real AuthenticatedContext instance but replaces
 * `withTransaction` with a vi.fn() mock.
 */
export function createMockAuthCtx(
  overrides?: Partial<{
    tenantId: string;
    userId: string;
    role: "ADMIN" | "OPERATOR" | "AGENT";
  }>,
) {
  const tenantId = overrides?.tenantId ?? "tenant-1";
  const userId = overrides?.userId ?? "user-1";
  const role = overrides?.role ?? "ADMIN";

  // We create a real instance for correct prototype chain / type compatibility
  const realCtx = new AuthenticatedContext(tenantId, userId, role);
  const mockWithTx = vi.fn();
  realCtx.withTransaction = mockWithTx as AuthenticatedContext["withTransaction"];

  return { ctx: realCtx, mockWithTx };
}

/**
 * Configures the mock `withTransaction` to invoke the callback
 * with a mock transaction that returns the given data sequence.
 */
export function setupMockTransaction(
  mockWithTx: ReturnType<typeof vi.fn>,
  mockDataSequence: unknown[],
) {
  const { tx } = createMockTx(mockDataSequence);
  mockWithTx.mockImplementation(
    <T>(fn: (tx: Transaction) => Promise<T>): Promise<T> => fn(tx),
  );
}
