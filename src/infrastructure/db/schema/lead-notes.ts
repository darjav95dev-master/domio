import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { leads } from "./leads";
import { users } from "./users";

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lead_notes_tenant_lead_created_idx").on(
      table.tenantId,
      table.leadId,
      table.createdAt,
    ),
  ],
);

export type LeadNote = typeof leadNotes.$inferSelect;
export type NewLeadNote = typeof leadNotes.$inferInsert;
