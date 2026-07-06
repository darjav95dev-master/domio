import {
  pgTable,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { leadStatusEnum } from "./enums";
import { tenants } from "./tenants";
import { leads } from "./leads";
import { users } from "./users";
import { tenantIsolationPolicy } from "./rls";

export const leadHistory = pgTable(
  "lead_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    fromStatus: leadStatusEnum("from_status"),
    toStatus: leadStatusEnum("to_status").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lead_history_tenant_lead_created_idx").on(
      table.tenantId,
      table.leadId,
      table.createdAt,
    ),
    tenantIsolationPolicy("lead_history"),
  ],
).enableRLS();

export type LeadHistory = typeof leadHistory.$inferSelect;
export type NewLeadHistory = typeof leadHistory.$inferInsert;
