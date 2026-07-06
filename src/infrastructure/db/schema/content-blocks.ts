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

export const contentBlocks = pgTable(
  "content_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    pageKey: text("page_key").notNull(),
    blockKey: text("block_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("content_blocks_tenant_page_block_idx").on(
      table.tenantId,
      table.pageKey,
      table.blockKey,
    ),
    tenantIsolationPolicy("content_blocks"),
  ],
).enableRLS();

export type ContentBlock = typeof contentBlocks.$inferSelect;
export type NewContentBlock = typeof contentBlocks.$inferInsert;
