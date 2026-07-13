ALTER TABLE "arsop_requests" DROP CONSTRAINT "arsop_requests_lead_id_leads_id_fk";
--> statement-breakpoint
ALTER TABLE "promociones" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "arsop_requests" ALTER COLUMN "lead_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_prefix" varchar(8);--> statement-breakpoint
ALTER TABLE "arsop_requests" ADD CONSTRAINT "arsop_requests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;