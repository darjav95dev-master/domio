import {
  pgTable,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";
import { arsopRequestTypeEnum } from "./enums";
import { tenants } from "./tenants";
import { leads } from "./leads";
import { users } from "./users";
import { mediaAssets } from "./media-assets";
import { tenantIsolationPolicy } from "./rls";

export const arsopRequests = pgTable(
  "arsop_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .references(() => leads.id, { onDelete: "set null" }),
    requestType: arsopRequestTypeEnum("request_type").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedBy: uuid("processed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    resultAssetId: uuid("result_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
  },
  () => [tenantIsolationPolicy("arsop_requests")],
).enableRLS();

export type ArsopRequest = typeof arsopRequests.$inferSelect;
export type NewArsopRequest = typeof arsopRequests.$inferInsert;
