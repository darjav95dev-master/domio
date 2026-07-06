import { sql, type ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import * as schema from "@/infrastructure/db/schema";
import { db } from "@/infrastructure/db/client";

export type TenantContextType = "public" | "authenticated" | "apikey";

export type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export abstract class TenantContext {
  abstract readonly type: TenantContextType;

  protected constructor(protected readonly tenantId: string) {}

  getTenantId(): string {
    return this.tenantId;
  }

  resolveFilters?(): Record<string, unknown>;

  async withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SET LOCAL app.current_tenant_id = ${this.tenantId}`,
      );
      return fn(tx);
    });
  }
}
