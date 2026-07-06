import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { unitStatusEnum } from "./enums";
import { tenants } from "./tenants";
import { tipologias } from "./tipologias";

export const unidades = pgTable(
  "unidades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    tipologiaId: uuid("tipologia_id")
      .notNull()
      .references(() => tipologias.id, { onDelete: "cascade" }),
    identifier: text("identifier"),
    status: unitStatusEnum("status").notNull().default("AVAILABLE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("unidades_tenant_tipologia_idx").on(table.tenantId, table.tipologiaId)],
);

export type Unidad = typeof unidades.$inferSelect;
export type NewUnidad = typeof unidades.$inferInsert;
