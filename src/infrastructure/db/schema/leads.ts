import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { leadStatusEnum, leadSourceEnum, leadChannelEnum } from "./enums";
import { tenants } from "./tenants";
import { promociones } from "./promociones";
import { tipologias } from "./tipologias";
import { users } from "./users";

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    promocionId: uuid("promocion_id")
      .notNull()
      .references(() => promociones.id, { onDelete: "cascade" }),
    tipologiaId: uuid("tipologia_id").references(() => tipologias.id, {
      onDelete: "set null",
    }),
    source: leadSourceEnum("source").notNull(),
    channel: leadChannelEnum("channel"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message"),
    status: leadStatusEnum("status").notNull().default("NEW"),
    assignedAgentId: uuid("assigned_agent_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("leads_tenant_status_idx").on(table.tenantId, table.status),
    index("leads_tenant_promocion_idx").on(table.tenantId, table.promocionId),
    index("leads_tenant_assigned_status_idx").on(
      table.tenantId,
      table.assignedAgentId,
      table.status,
    ),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
