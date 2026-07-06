import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { energyCertEnum } from "./enums";
import { tenants } from "./tenants";
import { promociones } from "./promociones";
import { mediaAssets } from "./media-assets";

export const tipologias = pgTable(
  "tipologias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    promocionId: uuid("promocion_id")
      .notNull()
      .references(() => promociones.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    usefulArea: integer("useful_area"),
    builtArea: integer("built_area"),
    floors: integer("floors"),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    yearBuilt: integer("year_built"),
    energyCert: energyCertEnum("energy_cert"),
    referencePriceSale: integer("reference_price_sale"),
    referencePriceRent: integer("reference_price_rent"),
    communityFee: integer("community_fee"),
    deposit: integer("deposit"),
    amenities: jsonb("amenities").$type<string[]>().default([]),
    planAssetId: uuid("plan_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("tipologias_tenant_promocion_idx").on(table.tenantId, table.promocionId)],
);

export type Tipologia = typeof tipologias.$inferSelect;
export type NewTipologia = typeof tipologias.$inferInsert;
