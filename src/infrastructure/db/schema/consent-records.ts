import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { leads } from "./leads";

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  legalBasis: text("legal_basis").notNull(),
  textAccepted: text("text_accepted").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ConsentRecord = typeof consentRecords.$inferSelect;
export type NewConsentRecord = typeof consentRecords.$inferInsert;
