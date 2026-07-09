-- Fix arsop_requests.lead_id FK: change ON DELETE CASCADE → SET NULL and allow NULL.
-- This allows the audit record to survive after the lead is hard-deleted (GDPR/ARSOP compliance).
ALTER TABLE "arsop_requests" DROP CONSTRAINT "arsop_requests_lead_id_leads_id_fk";--> statement-breakpoint
ALTER TABLE "arsop_requests" ALTER COLUMN "lead_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "arsop_requests" ADD CONSTRAINT "arsop_requests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
