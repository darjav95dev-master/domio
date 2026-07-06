import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";

export abstract class TenantAwareRepository {
  protected constructor(protected readonly ctx: TenantContext) {}

  protected withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.ctx.withTransaction(fn);
  }
}
