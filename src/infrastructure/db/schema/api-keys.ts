import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { tenantIsolationPolicy } from "./rls";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull(),
    keyPrefix: varchar("key_prefix", { length: 8 }),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("api_keys_tenant_key_hash_idx").on(table.tenantId, table.keyHash),
    tenantIsolationPolicy("api_keys"),
  ],
).enableRLS();

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
