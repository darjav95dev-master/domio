import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaAssetKindEnum, mediaAssetOwnerTypeEnum } from "./enums";
import { tenants } from "./tenants";
import { tenantIsolationPolicy } from "./rls";

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    ownerType: mediaAssetOwnerTypeEnum("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    kind: mediaAssetKindEnum("kind").notNull(),
    r2Key: text("r2_key").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    altText: text("alt_text").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isCover: boolean("is_cover").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("media_assets_tenant_owner_idx").on(
      table.tenantId,
      table.ownerType,
      table.ownerId,
    ),
    uniqueIndex("media_assets_tenant_owner_cover_idx")
      .on(table.tenantId, table.ownerId)
      .where(sql`${table.isCover} = true`),
    tenantIsolationPolicy("media_assets"),
  ],
).enableRLS();

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
