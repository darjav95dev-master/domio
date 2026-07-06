import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { tenantIsolationPolicy } from "./rls";

export const contactConfig = pgTable(
  "contact_config",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    hours: text("hours"),
    whatsappNumber: text("whatsapp_number"),
    whatsappPrefilledMessage: text("whatsapp_prefilled_message"),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [tenantIsolationPolicy("contact_config")],
).enableRLS();

export type ContactConfig = typeof contactConfig.$inferSelect;
export type NewContactConfig = typeof contactConfig.$inferInsert;
