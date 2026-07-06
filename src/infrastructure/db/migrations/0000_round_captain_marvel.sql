CREATE TYPE "public"."arsop_request_type" AS ENUM('EXPORT', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."construction_status" AS ENUM('ON_PLAN', 'IN_CONSTRUCTION', 'READY');--> statement-breakpoint
CREATE TYPE "public"."content_block_type" AS ENUM('DESCRIPCION_GENERAL', 'MEMORIA_CALIDADES', 'ZONAS_COMUNES', 'UBICACION_SERVICIOS', 'PLAZOS_GARANTIAS');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."energy_cert" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'EN_TRAMITE');--> statement-breakpoint
CREATE TYPE "public"."lead_channel" AS ENUM('FORM', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('commercial', 'institutional');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'CONTACTED', 'IN_NEGOTIATION', 'WON', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."map_privacy_mode" AS ENUM('EXACT', 'AREA');--> statement-breakpoint
CREATE TYPE "public"."media_asset_kind" AS ENUM('IMAGE_GALLERY', 'PLAN', 'DOCUMENT');--> statement-breakpoint
CREATE TYPE "public"."media_asset_owner_type" AS ENUM('PROMOCION', 'TIPOLOGIA', 'CONTENT');--> statement-breakpoint
CREATE TYPE "public"."operation_type" AS ENUM('SALE', 'RENT', 'SALE_AND_RENT');--> statement-breakpoint
CREATE TYPE "public"."promocion_kind" AS ENUM('portfolio', 'external');--> statement-breakpoint
CREATE TYPE "public"."promocion_status" AS ENUM('DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD', 'RENTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('piso', 'ático', 'casa', 'chalet', 'dúplex', 'estudio', 'local', 'oficina', 'nave', 'garaje', 'trastero', 'terreno');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'OPERATOR', 'AGENT');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'RENTED');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text,
	"role" "role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "promociones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "promocion_kind" NOT NULL,
	"status" "promocion_status" NOT NULL,
	"operation" "operation_type",
	"property_type" "property_type",
	"construction_status" "construction_status",
	"island" text,
	"municipality" text,
	"address" text,
	"location" geometry(Point,4326) NOT NULL,
	"location_approx" geometry(Point,4326) NOT NULL,
	"map_privacy_mode" "map_privacy_mode" NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"assigned_agent_id" uuid,
	"draft_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promociones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tipologias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"promocion_id" uuid NOT NULL,
	"name" text NOT NULL,
	"useful_area" integer,
	"built_area" integer,
	"floors" integer,
	"bedrooms" integer,
	"bathrooms" integer,
	"year_built" integer,
	"energy_cert" "energy_cert",
	"reference_price_sale" integer,
	"reference_price_rent" integer,
	"community_fee" integer,
	"deposit" integer,
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"plan_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tipologias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipologia_id" uuid NOT NULL,
	"identifier" text,
	"status" "unit_status" DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"owner_type" "media_asset_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "media_asset_kind" NOT NULL,
	"r2_key" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"alt_text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "promocion_content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"promocion_id" uuid NOT NULL,
	"block_type" "content_block_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promocion_content_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "promocion_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"promocion_id" uuid NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promocion_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"promocion_id" uuid NOT NULL,
	"tipologia_id" uuid,
	"source" "lead_source" NOT NULL,
	"channel" "lead_channel",
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text,
	"status" "lead_status" DEFAULT 'NEW' NOT NULL,
	"assigned_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lead_read_marks" (
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_read_marks_lead_id_user_id_pk" PRIMARY KEY("lead_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "lead_read_marks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lead_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lead_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"from_status" "lead_status",
	"to_status" "lead_status" NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"legal_basis" text NOT NULL,
	"text_accepted" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "arsop_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"request_type" "arsop_request_type" NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_by" uuid,
	"processed_at" timestamp with time zone,
	"result_asset_id" uuid
);
--> statement-breakpoint
ALTER TABLE "arsop_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"page_key" text NOT NULL,
	"block_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contact_config" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"hours" text,
	"whatsapp_number" text,
	"whatsapp_prefilled_message" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "content_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"content_key" text NOT NULL,
	"payload_snapshot" jsonb DEFAULT '{}'::jsonb,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" text NOT NULL,
	"template" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"status" "email_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"rate_limit_per_min" integer DEFAULT 60 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones" ADD CONSTRAINT "promociones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones" ADD CONSTRAINT "promociones_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_promocion_id_promociones_id_fk" FOREIGN KEY ("promocion_id") REFERENCES "public"."promociones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_plan_asset_id_media_assets_id_fk" FOREIGN KEY ("plan_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_tipologia_id_tipologias_id_fk" FOREIGN KEY ("tipologia_id") REFERENCES "public"."tipologias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion_content_blocks" ADD CONSTRAINT "promocion_content_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion_content_blocks" ADD CONSTRAINT "promocion_content_blocks_promocion_id_promociones_id_fk" FOREIGN KEY ("promocion_id") REFERENCES "public"."promociones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion_content_blocks" ADD CONSTRAINT "promocion_content_blocks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion_history" ADD CONSTRAINT "promocion_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion_history" ADD CONSTRAINT "promocion_history_promocion_id_promociones_id_fk" FOREIGN KEY ("promocion_id") REFERENCES "public"."promociones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion_history" ADD CONSTRAINT "promocion_history_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_promocion_id_promociones_id_fk" FOREIGN KEY ("promocion_id") REFERENCES "public"."promociones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tipologia_id_tipologias_id_fk" FOREIGN KEY ("tipologia_id") REFERENCES "public"."tipologias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_read_marks" ADD CONSTRAINT "lead_read_marks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_read_marks" ADD CONSTRAINT "lead_read_marks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_read_marks" ADD CONSTRAINT "lead_read_marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arsop_requests" ADD CONSTRAINT "arsop_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arsop_requests" ADD CONSTRAINT "arsop_requests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arsop_requests" ADD CONSTRAINT "arsop_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arsop_requests" ADD CONSTRAINT "arsop_requests_result_asset_id_media_assets_id_fk" FOREIGN KEY ("result_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_config" ADD CONSTRAINT "contact_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_config" ADD CONSTRAINT "contact_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_history" ADD CONSTRAINT "content_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_history" ADD CONSTRAINT "content_history_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "promociones_tenant_slug_idx" ON "promociones" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "promociones_tenant_status_idx" ON "promociones" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "promociones_tenant_kind_status_idx" ON "promociones" USING btree ("tenant_id","kind","status");--> statement-breakpoint
CREATE INDEX "promociones_tenant_construction_status_idx" ON "promociones" USING btree ("tenant_id","construction_status");--> statement-breakpoint
CREATE INDEX "promociones_location_gist_idx" ON "promociones" USING gist ("location");--> statement-breakpoint
CREATE INDEX "tipologias_tenant_promocion_idx" ON "tipologias" USING btree ("tenant_id","promocion_id");--> statement-breakpoint
CREATE INDEX "unidades_tenant_tipologia_idx" ON "unidades" USING btree ("tenant_id","tipologia_id");--> statement-breakpoint
CREATE INDEX "media_assets_tenant_owner_idx" ON "media_assets" USING btree ("tenant_id","owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_tenant_owner_cover_idx" ON "media_assets" USING btree ("tenant_id","owner_id") WHERE "media_assets"."is_cover" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_gallery_sort_idx" ON "media_assets" USING btree ("tenant_id","owner_id","sort_order") WHERE "media_assets"."kind" = 'IMAGE_GALLERY';--> statement-breakpoint
CREATE INDEX "promocion_content_blocks_tenant_promocion_idx" ON "promocion_content_blocks" USING btree ("tenant_id","promocion_id");--> statement-breakpoint
CREATE INDEX "promocion_history_tenant_promocion_idx" ON "promocion_history" USING btree ("tenant_id","promocion_id");--> statement-breakpoint
CREATE INDEX "leads_tenant_status_idx" ON "leads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "leads_tenant_promocion_idx" ON "leads" USING btree ("tenant_id","promocion_id");--> statement-breakpoint
CREATE INDEX "leads_tenant_assigned_status_idx" ON "leads" USING btree ("tenant_id","assigned_agent_id","status");--> statement-breakpoint
CREATE INDEX "lead_notes_tenant_lead_created_idx" ON "lead_notes" USING btree ("tenant_id","lead_id","created_at");--> statement-breakpoint
CREATE INDEX "lead_history_tenant_lead_created_idx" ON "lead_history" USING btree ("tenant_id","lead_id","created_at");--> statement-breakpoint
CREATE INDEX "content_blocks_tenant_page_block_idx" ON "content_blocks" USING btree ("tenant_id","page_key","block_key");--> statement-breakpoint
CREATE INDEX "content_history_tenant_type_key_idx" ON "content_history" USING btree ("tenant_id","content_type","content_key");--> statement-breakpoint
CREATE INDEX "email_queue_status_next_attempt_idx" ON "email_queue" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_tenant_key_hash_idx" ON "api_keys" USING btree ("tenant_id","key_hash");--> statement-breakpoint
CREATE POLICY "users_isolation" ON "users" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "promociones_isolation" ON "promociones" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "tipologias_isolation" ON "tipologias" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "unidades_isolation" ON "unidades" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "media_assets_isolation" ON "media_assets" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "promocion_content_blocks_isolation" ON "promocion_content_blocks" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "promocion_history_isolation" ON "promocion_history" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "leads_isolation" ON "leads" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "lead_read_marks_isolation" ON "lead_read_marks" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "lead_notes_isolation" ON "lead_notes" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "lead_history_isolation" ON "lead_history" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "consent_records_isolation" ON "consent_records" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "arsop_requests_isolation" ON "arsop_requests" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "content_blocks_isolation" ON "content_blocks" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "contact_config_isolation" ON "contact_config" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "content_history_isolation" ON "content_history" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "api_keys_isolation" ON "api_keys" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);