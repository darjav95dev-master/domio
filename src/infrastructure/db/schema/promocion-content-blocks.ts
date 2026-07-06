import {
  pgTable,
  uuid,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { contentBlockTypeEnum } from "./enums";
import { tenants } from "./tenants";
import { promociones } from "./promociones";
import { users } from "./users";

export const promocionContentBlocks = pgTable(
  "promocion_content_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    promocionId: uuid("promocion_id")
      .notNull()
      .references(() => promociones.id, { onDelete: "cascade" }),
    blockType: contentBlockTypeEnum("block_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("promocion_content_blocks_tenant_promocion_idx").on(
      table.tenantId,
      table.promocionId,
    ),
  ],
);

export type PromocionContentBlock =
  typeof promocionContentBlocks.$inferSelect;
export type NewPromocionContentBlock =
  typeof promocionContentBlocks.$inferInsert;
