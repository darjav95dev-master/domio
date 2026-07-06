import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { promociones } from "./promociones";
import { users } from "./users";
import { tenantIsolationPolicy } from "./rls";

export const promocionHistory = pgTable(
  "promocion_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    promocionId: uuid("promocion_id")
      .notNull()
      .references(() => promociones.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("promocion_history_tenant_promocion_idx").on(
      table.tenantId,
      table.promocionId,
    ),
    tenantIsolationPolicy("promocion_history"),
  ],
).enableRLS();

export type PromocionHistory = typeof promocionHistory.$inferSelect;
export type NewPromocionHistory = typeof promocionHistory.$inferInsert;
