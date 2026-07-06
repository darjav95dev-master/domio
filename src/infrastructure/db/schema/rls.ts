import { pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tenantIsolationExpression = sql`tenant_id = current_setting('app.current_tenant_id')::uuid`;

export function tenantIsolationPolicy(tableName: string) {
  return pgPolicy(`${tableName}_isolation`, {
    as: "permissive",
    for: "all",
    to: "public",
    using: tenantIsolationExpression,
  });
}
