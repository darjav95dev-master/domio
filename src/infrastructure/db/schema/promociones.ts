import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  promocionKindEnum,
  promocionStatusEnum,
  operationTypeEnum,
  propertyTypeEnum,
  constructionStatusEnum,
  mapPrivacyModeEnum,
} from "./enums";
import { tenants } from "./tenants";
import { users } from "./users";
import { geometryPoint4326 } from "./geo";
import { tenantIsolationPolicy } from "./rls";

export const promociones = pgTable(
  "promociones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: promocionKindEnum("kind").notNull(),
    status: promocionStatusEnum("status").notNull(),
    operation: operationTypeEnum("operation"),
    propertyType: propertyTypeEnum("property_type"),
    constructionStatus: constructionStatusEnum("construction_status"),
    island: text("island"),
    municipality: text("municipality"),
    address: text("address"),
    location: geometryPoint4326("location").notNull(),
    locationApprox: geometryPoint4326("location_approx").notNull(),
    mapPrivacyMode: mapPrivacyModeEnum("map_privacy_mode").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    assignedAgentId: uuid("assigned_agent_id").references(() => users.id, {
      onDelete: "set null",
    }),
    draftPayload: jsonb("draft_payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("promociones_tenant_slug_idx").on(table.tenantId, table.slug),
    index("promociones_tenant_status_idx").on(table.tenantId, table.status),
    index("promociones_tenant_kind_status_idx").on(
      table.tenantId,
      table.kind,
      table.status,
    ),
    index("promociones_tenant_construction_status_idx").on(
      table.tenantId,
      table.constructionStatus,
    ),
    index("promociones_location_gist_idx")
      .using("gist", table.location),
    tenantIsolationPolicy("promociones"),
  ],
).enableRLS();

export type Promocion = typeof promociones.$inferSelect;
export type NewPromocion = typeof promociones.$inferInsert;
