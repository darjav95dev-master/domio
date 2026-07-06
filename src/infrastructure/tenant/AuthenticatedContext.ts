import { sql } from "drizzle-orm";
import {
  TenantContext,
  type Transaction,
} from "@/infrastructure/tenant/TenantContext";

export type UserRole = "ADMIN" | "OPERATOR" | "AGENT";

export class AuthenticatedContext extends TenantContext {
  readonly type = "authenticated" as const;

  constructor(
    tenantId: string,
    public readonly userId: string,
    public readonly role: UserRole,
  ) {
    super(tenantId);
  }

  resolveFilters(): Record<string, unknown> {
    // No content filters — RLS policies handle per-tenant and per-agent row access
    return {};
  }

  async withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return super.withTransaction(async (tx) => {
      await tx.execute(
        sql`SET LOCAL app.current_user_id = ${this.userId}`,
      );
      return fn(tx);
    });
  }
}
