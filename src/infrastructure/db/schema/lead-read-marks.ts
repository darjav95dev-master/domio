import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { leads } from "./leads";
import { users } from "./users";

export const leadReadMarks = pgTable(
  "lead_read_marks",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.leadId, table.userId] })],
);

export type LeadReadMark = typeof leadReadMarks.$inferSelect;
export type NewLeadReadMark = typeof leadReadMarks.$inferInsert;
