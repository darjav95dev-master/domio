import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { tenantIsolationPolicy } from "./rls";

export const contentHistory = pgTable(
  "content_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    contentKey: text("content_key").notNull(),
    payloadSnapshot: jsonb("payload_snapshot")
      .$type<Record<string, unknown>>()
      .default({}),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("content_history_tenant_type_key_idx").on(
      table.tenantId,
      table.contentType,
      table.contentKey,
    ),
    tenantIsolationPolicy("content_history"),
  ],
).enableRLS();

export type ContentHistory = typeof contentHistory.$inferSelect;
export type NewContentHistory = typeof contentHistory.$inferInsert;
